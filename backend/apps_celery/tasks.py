from backend.apps_celery.__init__ import celery_app
from backend.models import db, User, Reservation, ParkingLot, ParkingSpot
from flask_mail import Message
from datetime import datetime, timedelta
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import matplotlib.pyplot as plt
import os

@celery_app.task
def add(x, y):
    return x + y

# filepath: d:\VP_App\backend\apps_celery\tasks.py
@celery_app.task
def send_parking_reminders():
    from app import app
    from backend.extentions import mail

    with app.app_context():
        now = datetime.now()
        reservations = Reservation.query.filter_by(status='reserved').all()
        for r in reservations:
            user = User.query.get(r.user_id)
            if not user or not user.email:
                continue
            time_to_start = (r.booking_date - now).total_seconds() / 60  # in minutes
            if 4.5 <= time_to_start <= 5.5:  # 5 minutes before booking
                msg = Message(
                    "Parking Reminder",
                    recipients=[user.email],
                    body=f"Hi {user.username}, your parking slot at {r.booking_date.strftime('%Y-%m-%d %H:%M')} is coming up in 5 minutes."
                )
                try:
                    mail.send(msg)
                except Exception as e:
                    print(f"Failed to send reminder to {user.email}: {e}")

@celery_app.task
def send_monthly_reports():
    """Generate and send monthly parking reports to all users."""
    from app import app
    from backend.extentions import mail

    with app.app_context():
        now = datetime.now()
        last_month = (now.replace(day=1) - timedelta(days=1)).replace(day=1)
        month_start = last_month
        month_end = now.replace(day=1) - timedelta(seconds=1)

        users = User.query.all()
        for user in users:
            # Fetch bookings for the user in the selected month
            bookings = Reservation.query.filter(
                Reservation.user_id == user.id,
                Reservation.booking_date >= month_start,
                Reservation.booking_date <= month_end
            ).all()

            if not bookings:
                # Generate a "No Activity" PDF
                pdf = generate_no_activity_pdf(user, last_month)
            else:
                # Generate the detailed monthly report PDF
                pdf = generate_monthly_report_pdf(user, bookings, last_month)

            # Send the report via email
            msg = Message(
                subject=f"Monthly Parking Report - {last_month.strftime('%B %Y')}",
                recipients=[user.email],
                body=f"Dear {user.username},\n\nPlease find attached your parking activity report for {last_month.strftime('%B %Y')}."
            )
            msg.attach(f"Monthly_Report_{last_month.strftime('%B_%Y')}.pdf", "application/pdf", pdf)
            try:
                mail.send(msg)
                print(f"Monthly report sent to {user.email}")
            except Exception as e:
                print(f"Failed to send report to {user.email}: {e}")

def generate_no_activity_pdf(user, month):
    """Generate a PDF for users with no activity."""
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    p.setFont("Helvetica", 12)
    p.drawString(50, 750, f"Monthly Parking Report - {month.strftime('%B %Y')}")
    p.drawString(50, 730, f"Dear {user.username},")
    p.drawString(50, 710, "You had no parking activity during this month.")
    p.showPage()
    p.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

def generate_monthly_report_pdf(user, bookings, month):
    """Generate a detailed monthly parking report PDF."""
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    p.setFont("Helvetica", 12)

    # Header
    p.drawString(50, 750, f"Monthly Parking Report - {month.strftime('%B %Y')}")
    p.drawString(50, 730, f"Name: {user.username}")
    p.drawString(50, 710, f"Email: {user.email}")

    # Booking Summary
    total_reservations = len(bookings)
    completed = [b for b in bookings if b.status == 'completed']
    not_parked = [b for b in bookings if b.status == 'not_parked']
    in_progress = [b for b in bookings if b.status == 'active']

    p.drawString(50, 680, f"Total Reservations: {total_reservations}")
    p.drawString(50, 660, f"Completed (Parked): {len(completed)}")
    p.drawString(50, 640, f"Reserved but Not Parked: {len(not_parked)}")
    p.drawString(50, 620, f"In-progress Bookings: {len(in_progress)}")

    # Detailed Table of Reservations
    y = 600
    p.drawString(50, y, "Date       Lot Name       Spot       Status       Start Time       End Time")
    y -= 20
    for b in bookings:
        lot = ParkingLot.query.get(b.lot_id)
        spot = ParkingSpot.query.get(b.spot_id)
        p.drawString(50, y, f"{b.booking_date.strftime('%Y-%m-%d')}  {lot.location_name if lot else ''}  {spot.spot_number if spot else ''}  {b.status}  {b.booking_date.strftime('%H:%M')}  {(b.booking_date + timedelta(hours=b.duration or 1)).strftime('%H:%M')}")
        y -= 20
        if y < 50:  # Start a new page if space runs out
            p.showPage()
            y = 750

    # Status Breakdown Chart
    chart_path = generate_status_chart(len(completed), len(not_parked), len(in_progress))
    if chart_path:
        p.drawImage(chart_path, 50, y - 200, width=500, height=200)
        os.remove(chart_path)  # Clean up the chart image

    p.showPage()
    p.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

def generate_status_chart(completed, not_parked, in_progress):
    """Generate a status breakdown chart and save it as an image."""
    labels = ['Completed', 'Not Parked', 'In-progress']
    values = [completed, not_parked, in_progress]
    colors = ['green', 'red', 'orange']

    plt.figure(figsize=(6, 4))
    plt.bar(labels, values, color=colors)
    plt.title('Booking Status Breakdown')
    plt.ylabel('Number of Bookings')

    chart_path = 'status_chart.png'
    plt.savefig(chart_path)
    plt.close()
    return chart_path