from flask import Blueprint, request, jsonify, send_file
from flask_security.utils import login_user, logout_user, hash_password, verify_password
from flask_login import current_user, login_required
from flask_security.datastore import SQLAlchemyUserDatastore
from backend.models import db, User, Role, ParkingLot, ParkingSpot, Reservation
from datetime import datetime, timedelta
from sqlalchemy import and_
from fpdf import FPDF

import os


api_bp = Blueprint('api', __name__)
user_datastore = SQLAlchemyUserDatastore(db, User, Role)
# ...existing code...
@api_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    if not data:
        return jsonify({'message': 'No input data provided'}), 400
    user = user_datastore.find_user(email=data.get('email'))
    print("Login attempt:", data.get('email'), "User found:", bool(user))
    if user:
        print("Stored hash:", user.password)
        print("Password matches:", verify_password(data['password'], user.password))
    if user and user.password and verify_password(data['password'], user.password):
        login_user(user)
        role = user.roles[0].name if user.roles else 'user'
        token = os.urandom(16).hex()  # Dummy token
        return jsonify({
            'message': 'Login successful',
            'user': {'username': user.username, 'email': user.email},
            'token': token,
            'role': role
        }), 200
    return jsonify({'message': 'Invalid credentials'}), 401
# ...existing code...
@api_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    if not data:
        return jsonify({'message': 'No input data provided'}), 400
    if user_datastore.find_user(email=data.get('email')):
        return jsonify({'message': 'Email already registered'}), 400
    user = user_datastore.create_user(
        username=data.get('username', data.get('email')),
        email=data['email'],
        password=hash_password(data['password']),
        phone_number=data.get('phone_number', '0000000000'),
        country=data.get('country', ''),
        state=data.get('state', ''),
        city=data.get('city', ''),
        Address=data.get('address', ''),  # <-- FIXED: capital "A"
        pin_code=data.get('pin_code', ''),
        user_profile_picture=data.get('user_profile', ''),
        fs_uniquifier=os.urandom(16).hex()
    )
    db.session.commit()
    login_user(user)
    role = user.roles[0].name if user.roles else 'user'
    token = os.urandom(16).hex()  # Dummy token
    return jsonify({
        'message': 'Registration successful',
        'user': {'username': user.username, 'email': user.email},
        'token': token,
        'role': role
    })

# ...existing code...
@api_bp.route('/logout', methods=['POST'])
def logout():
    logout_user()
    return jsonify({'message': 'Logged out'})

# @api_bp.route('/user', methods=['GET'])
# def get_user():
#     if not current_user.is_authenticated:
#         return jsonify({'user': None})
#     return jsonify({'user': {'username': current_user.username, 'email': current_user.email}})

@api_bp.route('/is_admin', methods=['GET'])
def is_admin():
    if not current_user.is_authenticated:
        return jsonify({'is_admin': False})
    is_admin = any(role.name == 'admin' for role in current_user.roles)
    return jsonify({'is_admin': is_admin})

# ADMIN DASHBOARD
@api_bp.route('/admin/profile_stats', methods=['GET'])
@login_required
def admin_profile_stats():
    # Only allow admin
    if not any(role.name == 'admin' for role in current_user.roles):
        return jsonify({'message': 'Unauthorized'}), 403

    # Admin profile info
    admin_info = {
        'username': current_user.username,
        'email': current_user.email,
        'role': 'admin'
    }

    # System statistics
    lots = ParkingLot.query.all()
    users = User.query.all()
    total_lots = len(lots)
    total_spots = 0
    available = reserved = occupied = 0

    for lot in lots:
        spots = ParkingSpot.query.filter_by(lot_id=lot.id).all()
        total_spots += len(spots)
        for spot in spots:
            # Get latest reservation for spot
            reservation = Reservation.query.filter(
                Reservation.spot_id == spot.id,
                Reservation.status.in_(['active', 'reserved'])
            ).order_by(Reservation.booking_date.desc()).first()
            now = datetime.now()
            if reservation:
                start = reservation.booking_date
                end = start + timedelta(hours=reservation.duration or 1)
                if now < start:
                    reserved += 1
                elif start <= now < end:
                    occupied += 1
                else:
                    available += 1
            else:
                available += 1

    stats = {
        'total_lots': total_lots,
        'total_spots': total_spots,
        'available': available,
        'reserved': reserved,
        'occupied': occupied,
        'total_users': len(users)
    }

    return jsonify({'admin': admin_info, 'stats': stats})


@api_bp.route('/admin/lot_status_chart', methods=['GET'])
@login_required
def admin_lot_status_chart():
    if not any(role.name == 'admin' for role in current_user.roles):
        return jsonify({'message': 'Unauthorized'}), 403

    lots = ParkingLot.query.all()
    result = []
    now = datetime.now()
    for lot in lots:
        spots = ParkingSpot.query.filter_by(lot_id=lot.id).all()
        available = reserved = occupied = 0
        for spot in spots:
            reservation = Reservation.query.filter(
                Reservation.spot_id == spot.id,
                Reservation.status.in_(['active', 'reserved'])
            ).order_by(Reservation.booking_date.desc()).first()
            if reservation:
                start = reservation.booking_date
                end = start + timedelta(hours=reservation.duration or 1)
                if reservation.status == 'reserved' and now < start:
                    reserved += 1
                elif reservation.status == 'active' and start <= now < end:
                    occupied += 1
                else:
                    available += 1
            else:
                available += 1
        result.append({
            "name": lot.location_name,
            "available": available,
            "reserved": reserved,
            "occupied": occupied
        })
    return jsonify({"lots": result})
    return jsonify({"lots": result})


@api_bp.route('/admin/revenue_chart', methods=['GET'])
@login_required
def admin_revenue_chart():
    if not any(role.name == 'admin' for role in current_user.roles):
        return jsonify({'message': 'Unauthorized'}), 403

    lots = ParkingLot.query.all()
    result = []
    total_revenue = 0
    for lot in lots:
        # Sum revenue for completed reservations in this lot
        revenue = 0
        reservations = Reservation.query.filter_by(lot_id=lot.id, status='completed').all()
        for r in reservations:
            if r.parking_cost:
                revenue += r.parking_cost
            elif lot.price and r.duration:
                revenue += lot.price * r.duration
        total_revenue += revenue
        result.append({
            "name": lot.location_name,
            "revenue": revenue
        })
    return jsonify({"lots": result, "total_revenue": total_revenue})

@api_bp.route('/parking_lots', methods=['GET'])
def get_parking_lots():
    lots = ParkingLot.query.all()
    result = []
    for lot in lots:
        spots = ParkingSpot.query.filter_by(lot_id=lot.id).all()
        result.append({
            'id': lot.id,
            'location_name': lot.location_name,
            'address': lot.address,
            'price': lot.price,
            'number_of_spots': lot.number_of_spots,
            'city': lot.city,
            'state': lot.state,
            'country': lot.country,
            'pin_code': lot.pin_code,
            'spots': [
                {
                    'id': spot.id,
                    'spot_number': spot.spot_number,
                    'status': spot.status
                    # Remove 'user' and 'reservation' unless you have those relationships
                } for spot in spots
            ]
        })
    return jsonify(result)

@api_bp.route('/parking_lots', methods=['POST'])
def add_parking_lot():
    data = request.json
    lot = ParkingLot(
        location_name=data['location_name'],
        address=data['address'],
        price=data['price'],
        number_of_spots=data['number_of_spots'],
        city=data.get('city', ''),
        state=data.get('state', ''),
        country=data.get('country', ''),
        pin_code=data.get('pin_code', '')
    )
    db.session.add(lot)
    db.session.commit()
    # Fix: use lot_id instead of parking_lot_id
    for i in range(1, lot.number_of_spots + 1):
        spot = ParkingSpot(
            lot_id=lot.id,
            spot_number=str(i),
            status='A'
        )
        db.session.add(spot)
    db.session.commit()
    return jsonify({'message': 'Lot created'}), 201

@api_bp.route('/parking_lots/<int:lot_id>', methods=['PUT'])
def edit_parking_lot(lot_id):
    data = request.json
    lot = ParkingLot.query.get_or_404(lot_id)
    old_total = lot.number_of_spots
    new_total = data['number_of_spots']
    lot.location_name = data['location_name']
    lot.address = data['address']
    lot.price = data['price']
    lot.number_of_spots = new_total
    lot.city = data.get('city', '')
    lot.state = data.get('state', '')
    lot.country = data.get('country', '')
    lot.pin_code = data.get('pin_code', '')

    db.session.commit()

    # Adjust spots if number changed
    if new_total > old_total:
        # Add new spots
        for i in range(old_total + 1, new_total + 1):
            spot = ParkingSpot(
                lot_id=lot.id,
                spot_number=str(i),
                status='A'
            )
            db.session.add(spot)
        db.session.commit()
    elif new_total < old_total:
        # Remove extra spots (only if available)
        removable_spots = ParkingSpot.query.filter(
            ParkingSpot.lot_id == lot.id,
            ParkingSpot.spot_number.in_([str(i) for i in range(new_total + 1, old_total + 1)]),
            ParkingSpot.status == 'A'
        ).all()
        for spot in removable_spots:
            db.session.delete(spot)
        db.session.commit()
    return jsonify({'message': 'Lot updated'})

@api_bp.route('/parking_lots/<int:lot_id>', methods=['DELETE'])
def delete_parking_lot(lot_id):
    lot = ParkingLot.query.get_or_404(lot_id)
    Reservation.query.filter_by(lot_id=lot_id).delete()
    ParkingSpot.query.filter_by(lot_id=lot_id).delete()
    db.session.delete(lot)
    db.session.commit()
    return jsonify({'message': 'Lot deleted'})


from datetime import datetime, timedelta

@api_bp.route('/parking_lots/<int:lot_id>/spots', methods=['GET'])
def get_parking_spots(lot_id):
    spots = ParkingSpot.query.filter_by(lot_id=lot_id).all()
    result = []
    now = datetime.now()
    for spot in spots:
        reservation = Reservation.query.filter(
            Reservation.spot_id == spot.id,
            Reservation.status.in_(['active', 'reserved'])
        ).order_by(Reservation.booking_date.desc()).first()
        user_info = None
        start_time = None
        end_time = None
        res_status = 'A'
        if reservation:
            user = User.query.get(reservation.user_id)
            start_time = reservation.booking_date.strftime('%Y-%m-%d %H:%M')
            end_dt = reservation.booking_date + timedelta(hours=reservation.duration or 1)
            end_time = end_dt.strftime('%Y-%m-%d %H:%M')
            if now < reservation.booking_date:
                res_status = 'R'
                user_info = {'username': user.username, 'email': user.email} if user else None
            elif reservation.booking_date <= now < end_dt:
                res_status = 'O'
                user_info = {'username': user.username, 'email': user.email} if user else None
            else:
                res_status = 'A'
                user_info = None
        result.append({
            'id': spot.id,
            'spot_number': spot.spot_number,
            'status': res_status,
            'user': user_info,
            'start_time': start_time,
            'end_time': end_time
        })
    return jsonify(result)


@api_bp.route('/admin/update_spot_status', methods=['POST'])
@login_required
def update_spot_status():
    # Only allow admin
    if not any(role.name == 'admin' for role in current_user.roles):
        return jsonify({'message': 'Unauthorized'}), 403
    data = request.json
    spot_id = data.get('spot_id')
    status = data.get('status')
    spot = ParkingSpot.query.get(spot_id)
    if not spot:
        return jsonify({'message': 'Spot not found'}), 404
    spot.status = status
    db.session.commit()
    return jsonify({'message': 'Spot status updated'})


@api_bp.route('/admin/customers', methods=['GET'])
@login_required
def get_all_customers():
    # Only allow admin
    if not any(role.name == 'admin' for role in current_user.roles):
        return jsonify({'message': 'Unauthorized'}), 403

    # Fetch only non-admin users
    users = User.query.filter(~User.roles.any(Role.name == 'admin')).all()
    result = []
    for user in users:
        result.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'phone_number': user.phone_number,
            'Address': user.Address,
            'city': user.city,
            'state': user.state,
            'country': user.country,
            'pin_code': user.pin_code,
            'created_at': user.created_at.isoformat() if user.created_at else ''
        })
    return jsonify(result)

@api_bp.route('/admin/user_reservations/<int:user_id>', methods=['GET'])
@login_required
def get_user_reservations(user_id):
    """Fetch all reservations for a specific user."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    reservations = Reservation.query.filter_by(user_id=user_id).order_by(Reservation.booking_date.desc()).all()

    result = []
    for reservation in reservations:
        lot = ParkingLot.query.get(reservation.lot_id)
        spot = ParkingSpot.query.get(reservation.spot_id)
        result.append({
            'reservation_id': reservation.id,
            'username': user.username,
            'email': user.email,
            'lot_name': lot.location_name if lot else '',
            'spot_number': spot.spot_number if spot else '',
            'start_time': reservation.booking_date.strftime('%Y-%m-%d %H:%M'),
            'end_time': (reservation.booking_date + timedelta(hours=reservation.duration or 1)).strftime('%Y-%m-%d %H:%M'),
            'status': reservation.status,
            'payment_status': reservation.payment_status,
            'parking_cost': reservation.parking_cost or 0,
            'remarks': reservation.remarks or 'N/A',
        })

    return jsonify(result)


@api_bp.route('/admin/users', methods=['GET'])
@login_required
def get_users():
    """Fetch all non-admin users with their total bookings."""
    # Only allow admin access
    if not any(role.name == 'admin' for role in current_user.roles):
        return jsonify({'error': 'Unauthorized'}), 403

    # Fetch only non-admin users
    users = User.query.filter(~User.roles.any(Role.name == 'admin')).all()
    result = []
    for user in users:
        result.append({
            'id': user.id,
            'name': user.username,
            'email': user.email,
            'total_bookings': len(user.reservations)  # Assuming a relationship exists
        })
    return jsonify(result)

@api_bp.route('/admin/user_bookings/<int:user_id>', methods=['GET'])
@login_required
def get_user_bookings(user_id):
    """Fetch all bookings (active and previous) for a specific user."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    bookings = Reservation.query.filter_by(user_id=user_id).order_by(Reservation.booking_date.desc()).all()

    result = []
    for booking in bookings:
        lot = ParkingLot.query.get(booking.lot_id)
        spot = ParkingSpot.query.get(booking.spot_id)
        result.append({
            'user': {
                'name': user.username,
                'email': user.email,
                'phone_number': user.phone_number,
                'address': user.Address,
                'city': user.city,
                'state': user.state,
                'country': user.country,
                'pin_code': user.pin_code,
            },
            'reservation': {
                'date': booking.booking_date.strftime('%Y-%m-%d'),
                'lot': lot.location_name if lot else '',
                'spot': spot.spot_number if spot else '',
                'status': booking.status,
                'start': booking.booking_date.strftime('%H:%M'),
                'end': (booking.booking_date + timedelta(hours=booking.duration or 1)).strftime('%H:%M'),
                'amount': booking.parking_cost or 0,
                'remarks': booking.remarks,
                'payment_status': booking.payment_status,
            }
        })

    return jsonify(result)

@api_bp.route('/admin/user_details/<int:user_id>', methods=['GET'])
@login_required
def get_user_details(user_id):
    """Fetch detailed user profile and available months for booking data."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    available_months = Reservation.query.with_entities(
        db.func.strftime('%Y-%m', Reservation.booking_date).label('month')
    ).filter_by(user_id=user_id).distinct().all()

    return jsonify({
        'name': user.username,
        'email': user.email,
        'phone': user.phone_number,
        'registration_date': user.created_at.strftime('%Y-%m-%d'),
        'available_months': [m[0] for m in available_months]
    })


@api_bp.route('/admin/user_monthly_report/<int:user_id>', methods=['GET'])
@login_required
def get_user_monthly_report(user_id):
    """Fetch monthly report data for a specific user and month."""
    month = request.args.get('month')
    if not month:
        return jsonify({'error': 'Month is required'}), 400

    start_date = f"{month}-01"
    end_date = f"{month}-31"

    bookings = Reservation.query.filter(
        Reservation.user_id == user_id,
        Reservation.booking_date.between(start_date, end_date)
    ).all()

    total_bookings = len(bookings)
    total_hours = sum(b.duration for b in bookings if b.duration is not None)
    total_spend = sum(b.parking_cost or 0 for b in bookings)  # Replace None with 0

    most_used_lot = db.session.query(
        ParkingLot.location_name, db.func.count(ParkingLot.id)
    ).join(Reservation, Reservation.lot_id == ParkingLot.id).filter(
        Reservation.user_id == user_id,
        Reservation.booking_date.between(start_date, end_date)
    ).group_by(ParkingLot.location_name).order_by(db.func.count(ParkingLot.id).desc()).first()

    result = {
        'total_bookings': total_bookings,
        'total_hours': total_hours,
        'total_spend': total_spend,
        'most_used_lot': most_used_lot[0] if most_used_lot else None,
        'bookings': [{
            'date': b.booking_date.strftime('%Y-%m-%d'),
            'lot': ParkingLot.query.get(b.lot_id).location_name,
            'spot': ParkingSpot.query.get(b.spot_id).spot_number,
            'status': b.status,
            'start': b.booking_date.strftime('%H:%M'),
            'end': (b.booking_date + timedelta(hours=b.duration)).strftime('%H:%M') if b.duration else None
        } for b in bookings]
    }

    return jsonify(result)


@api_bp.route('/admin/export_report/<int:user_id>', methods=['GET'])
@login_required
def export_report(user_id):
    """Generate and export a monthly report as PDF or CSV."""
    month = request.args.get('month')
    format = request.args.get('format', 'csv')  # Default to CSV

    if not month:
        return jsonify({'error': 'Month is required'}), 400

    # Fetch data for the report
    start_date = f"{month}-01"
    end_date = f"{month}-31"
    bookings = Reservation.query.filter(
        Reservation.user_id == user_id,
        Reservation.booking_date.between(start_date, end_date)
    ).all()

    if not bookings:
        return jsonify({'error': 'No bookings found for the selected month'}), 404

    # Generate the report
    report_path = f"reports/user_{user_id}_report_{month}.{format}"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)

    if format == 'csv':
        # Generate CSV content without the 'amount' column
        with open(report_path, 'w', newline='', encoding='utf-8') as f:
            f.write("Date,Lot,Spot,Status,Start,End\n")  # Header row without 'Amount'
            for b in bookings:
                lot = ParkingLot.query.get(b.lot_id).location_name
                spot = ParkingSpot.query.get(b.spot_id).spot_number
                start = b.booking_date.strftime('%H:%M')
                end = (b.booking_date + timedelta(hours=b.duration or 1)).strftime('%H:%M')
                f.write(f"{b.booking_date.strftime('%Y-%m-%d')},{lot},{spot},{b.status},{start},{end}\n")

    else:
        return jsonify({'error': 'Unsupported format'}), 400

    # Serve the file
    return send_file(report_path, as_attachment=True)

@api_bp.route('/admin/reservation_detail', methods=['POST'])
@login_required
def admin_reservation_detail():
    if not any(role.name == 'admin' for role in current_user.roles):
        return jsonify({'message': 'Unauthorized'}), 403
    data = request.json
    lot_name = data.get('lot_name')
    spot_number = data.get('spot_number')
    username = data.get('username')
    start_time = data.get('start_time')
    lot = ParkingLot.query.filter_by(location_name=lot_name).first()
    spot = ParkingSpot.query.filter_by(lot_id=lot.id, spot_number=spot_number).first() if lot else None
    user = User.query.filter_by(username=username).first()
    from datetime import datetime, timedelta
    try:
        start_dt = datetime.strptime(start_time, "%Y-%m-%d %H:%M")
    except Exception:
        return jsonify({'message': 'Invalid start time'}), 400
    reservation = Reservation.query.filter_by(
        lot_id=lot.id if lot else None,
        spot_id=spot.id if spot else None,
        user_id=user.id if user else None,
        booking_date=start_dt,
        status='completed'
    ).first()
    if not reservation:
        return jsonify({'message': 'Reservation not found'}), 404
    vehicle = reservation.vehicle
    amount = reservation.parking_cost if reservation.parking_cost else (lot.price * reservation.duration if lot and reservation.duration else None)
    return jsonify({
        'id': reservation.id,
        'username': user.username if user else '',
        'email': user.email if user else '',
        'lot_name': lot.location_name if lot else '',
        'spot_number': spot.spot_number if spot else '',
        'vehicle_number': vehicle.vehicle_number if vehicle else '',
        'vehicle_type': vehicle.vehicle_type if vehicle else '',
        'start_time': reservation.booking_date.strftime('%Y-%m-%d %H:%M'),
        'end_time': (reservation.booking_date + timedelta(hours=reservation.duration or 1)).strftime('%Y-%m-%d %H:%M'),
        'duration': reservation.duration,
        'parking_cost': amount,          # add amount field
        'status': reservation.status,
        'payment_status': reservation.payment_status,
        'remarks': reservation.remarks,
        'parking_timestamp': reservation.booking_date.strftime('%Y-%m-%d %H:%M'),
        'leaving_timestamp': reservation.leaving_timestamp.strftime('%Y-%m-%d %H:%M') if reservation.leaving_timestamp else ''
    })

# Get active booking for the user

@api_bp.route('/user/active_booking', methods=['GET'])
@login_required
def get_active_booking():
    reservation = Reservation.query.filter_by(user_id=current_user.id, status='active').first()
    if not reservation:
        return jsonify({'message': 'No active booking'}), 404
    lot = ParkingLot.query.get(reservation.lot_id)
    spot = ParkingSpot.query.get(reservation.spot_id)
    return jsonify({
        'lot_name': lot.location_name,
        'spot_number': spot.spot_number,
        'start_time': reservation.booking_date.strftime('%Y-%m-%d %H:%M:%S')
    })

@api_bp.route('/user', methods=['GET'])
@login_required
def get_user_profile():
    user = current_user
    profile = {
        'username': user.username,
        'email': user.email,
        'phone_number': user.phone_number,
        'city': user.city,
        'state': user.state,
        'country': user.country,
        'address': user.Address,  # Use capital "A" for your model
        'pin_code': user.pin_code,
        'user_profile_picture': user.user_profile_picture
    }
    return jsonify({'user': profile})


@api_bp.route('/user/edit_profile', methods=['POST'])
@login_required
def edit_user_profile():
    data = request.get_json()
    user = current_user

    user.username = data.get('username', user.username)
    user.email = data.get('email', user.email)
    user.phone_number = data.get('phone_number', user.phone_number)
    user.city = data.get('city', user.city)
    user.state = data.get('state', user.state)
    user.country = data.get('country', user.country)
    user.Address = data.get('address', user.Address)  # <-- Fix here
    user.pin_code = data.get('pin_code', user.pin_code)
    user.user_profile_picture = data.get('user_profile_picture', user.user_profile_picture)

    db.session.commit()

    profile = {
        'username': user.username,
        'email': user.email,
        'phone_number': user.phone_number,
        'city': user.city,
        'state': user.state,
        'country': user.country,
        'address': user.Address,  # <-- Fix here
        'pin_code': user.pin_code,
        'user_profile_picture': user.user_profile_picture
    }
    return jsonify({'user': profile, 'message': 'Profile updated successfully'})


# Book a spot in a lot
@api_bp.route('/user/book_spot', methods=['POST'])
@login_required
def book_spot():
    data = request.json
    lot_id = data.get('lot_id')
    spot_id = data.get('spot_id')  # May be None
    vehicle_type = data.get('vehicle_type')
    vehicle_number = data.get('vehicle_number')
    booking_date = data.get('booking_date')
    booking_time = data.get('booking_time')
    end_time = data.get('end_time')
    booking_type = data.get('booking_type', 'book')

    if not lot_id or not vehicle_type or not vehicle_number or not booking_date or not booking_time or not end_time:
        return jsonify({'message': 'Missing booking details'}), 400

    from backend.models import Vehicle
    from datetime import datetime, timedelta

    # Combine date and time for booking start/end
    try:
        booking_datetime = datetime.strptime(f"{booking_date} {booking_time}", "%Y-%m-%d %H:%M")
        end_datetime = datetime.strptime(f"{booking_date} {end_time}", "%Y-%m-%d %H:%M")
    except Exception:
        return jsonify({'message': 'Invalid date/time format'}), 400

    now = datetime.now()
    if booking_datetime < now or end_datetime < now:
        return jsonify({'message': 'Booking failed: Please choose a current or future time for booking.'}), 400

    duration = int((end_datetime - booking_datetime).total_seconds() // 3600)
    if duration < 1:
        return jsonify({'message': 'End time must be after start time'}), 400

    # Find any available spot in the lot if spot_id not provided
    if spot_id:
        spot = ParkingSpot.query.filter_by(id=spot_id, lot_id=lot_id, status='A').first()
    else:
        spot = ParkingSpot.query.filter_by(lot_id=lot_id, status='A').first()
    if not spot:
        return jsonify({'message': 'No available spots in this lot'}), 400

    # Check for overlapping reservation for this spot
    existing_reservations = Reservation.query.filter(
        Reservation.spot_id == spot.id,
        Reservation.status.in_(['active', 'reserved'])
    ).all()
    for existing in existing_reservations:
        existing_start = existing.booking_date
        existing_end = existing_start + timedelta(hours=existing.duration or 1)
        if existing_start < end_datetime and existing_end > booking_datetime:
            return jsonify({'message': 'This spot is already booked for the selected time'}), 400

    # Create or get vehicle
    vehicle = Vehicle.query.filter_by(vehicle_number=vehicle_number).first()
    if not vehicle:
        vehicle = Vehicle(
            user_id=current_user.id,
            vehicle_number=vehicle_number,
            vehicle_type=vehicle_type
        )
        db.session.add(vehicle)
        db.session.commit()

    # Status logic
    if booking_datetime > now:
        spot.status = 'R'
        res_status = 'reserved'
    else:
        spot.status = 'O'
        res_status = 'active'

    reservation = Reservation(
        spot_id=spot.id,
        user_id=current_user.id,
        lot_id=lot_id,
        vehicle_id=vehicle.id,
        duration=duration,
        booking_date=booking_datetime,
        status=res_status,
        payment_status='unpaid'
    )
    db.session.add(reservation)
    db.session.commit()

    lot = ParkingLot.query.get(lot_id)
    return jsonify({
        'lot_name': lot.location_name,
        'spot_number': spot.spot_number,
        'start_time': reservation.booking_date.strftime('%Y-%m-%d %H:%M'),
        'end_time': (reservation.booking_date + timedelta(hours=duration)).strftime('%Y-%m-%d %H:%M'),
        'status': res_status
    })


@api_bp.route('/user/park_spot', methods=['POST'])
@login_required
def park_spot():
    data = request.json
    lot_name = data.get('lot_name')
    spot_number = data.get('spot_number')
    start_time = data.get('start_time')
    lot = ParkingLot.query.filter_by(location_name=lot_name).first()
    spot = ParkingSpot.query.filter_by(lot_id=lot.id, spot_number=spot_number).first() if lot else None
    reservation = Reservation.query.filter_by(
        user_id=current_user.id,
        spot_id=spot.id if spot else None,
        status='reserved'
    ).first() if spot else None
    if not reservation or not spot:
        return jsonify({'message': 'No reserved booking found'}), 400
    spot.status = 'O'
    reservation.status = 'active'
    reservation.parking_timestamp = datetime.now()
    db.session.commit()
    return jsonify({'message': 'Spot parked'})



# Vacate current spot
@api_bp.route('/user/vacate_spot', methods=['POST'])
@login_required
def vacate_spot():
    data = request.get_json()
    lot_name = data.get('lot_name')
    spot_number = data.get('spot_number')
    start_time = data.get('start_time')

    lot = ParkingLot.query.filter_by(location_name=lot_name).first()
    spot = ParkingSpot.query.filter_by(lot_id=lot.id, spot_number=spot_number).first() if lot else None
    from datetime import datetime
    try:
        start_dt = datetime.strptime(start_time, "%Y-%m-%d %H:%M")
    except Exception:
        return jsonify({'message': 'Invalid start time'}), 400

    reservation = Reservation.query.filter_by(
        lot_id=lot.id if lot else None,
        spot_id=spot.id if spot else None,
        user_id=current_user.id,
        booking_date=start_dt,
        status='active'
    ).first()

    if not reservation:
        return jsonify({'message': 'No active reservation found'}), 404

    now = datetime.now()
    reservation.status = 'completed'
    reservation.leaving_timestamp = now
    spot.status = 'A'
    # Calculate fee based on actual duration
    duration_hours = max(1, int((now - reservation.booking_date).total_seconds() // 3600))
    reservation.duration = duration_hours
    lot_price = lot.price if lot else 0
    reservation.parking_cost = lot_price * duration_hours
    reservation.payment_status = 'paid'
    db.session.commit()
    return jsonify({'message': 'Spot vacated', 'actual_end_time': now.strftime('%Y-%m-%d %H:%M'), 'amount': reservation.parking_cost})



@api_bp.route('/user/bookings', methods=['GET'])
@login_required
def user_bookings():
    from datetime import datetime, timedelta
    reservations = Reservation.query.filter(
        Reservation.user_id == current_user.id,
        Reservation.status.in_(['active', 'reserved', 'completed'])
    ).order_by(Reservation.booking_date.desc()).all()
    result = []
    now = datetime.now()
    for r in reservations:
        lot = ParkingLot.query.get(r.lot_id)
        spot = ParkingSpot.query.get(r.spot_id)
        start_time = r.booking_date
        # Use leaving_timestamp for completed bookings, else calculate from duration
        if r.status == 'completed' and r.leaving_timestamp:
            end_time = r.leaving_timestamp
        else:
            end_time = start_time + timedelta(hours=r.duration or 1)
        # Not Parked logic: reserved expired and never parked
        status = r.status
        if r.status == 'reserved' and now > end_time:
            status = 'not_parked'
            r.status = 'not_parked'  # Update reservation status
            if spot:
                spot.status = 'A'  # Mark the spot as available
            db.session.commit()  # Persist changes to the database
        amount = r.parking_cost if r.parking_cost else (lot.price * r.duration if lot and r.duration else None)
        result.append({
            'lot_name': lot.location_name if lot else '',
            'spot_number': spot.spot_number if spot else '',
            'start_time': start_time.strftime('%Y-%m-%d %H:%M'),
            'end_time': end_time.strftime('%Y-%m-%d %H:%M'),
            'status': status,
            'amount': amount
        })
    return jsonify(result)



@api_bp.route('/user/history', methods=['GET'])
@login_required
def user_history():
    from datetime import datetime, timedelta
    reservations = Reservation.query.filter_by(user_id=current_user.id, status='completed').order_by(Reservation.booking_date.desc()).all()
    result = []
    for r in reservations:
        lot = ParkingLot.query.get(r.lot_id)
        spot = ParkingSpot.query.get(r.spot_id)
        start_time = r.booking_date
        end_time = r.leaving_timestamp if r.leaving_timestamp else (start_time + timedelta(hours=r.duration or 1))
        amount = r.parking_cost if r.parking_cost else (lot.price * r.duration if lot and r.duration else None)
        result.append({
            'lot_name': lot.location_name if lot else '',
            'spot_number': spot.spot_number if spot else '',
            'start_time': start_time.strftime('%Y-%m-%d %H:%M'),
            'end_time': end_time.strftime('%Y-%m-%d %H:%M'),
            'status': r.status,
            'amount': amount
        })
    return jsonify(result)



@api_bp.route('/user/monthly_activity_chart', methods=['GET'])
@login_required
def user_monthly_activity_chart():
    from collections import defaultdict
    from datetime import datetime
    reservations = Reservation.query.filter_by(user_id=current_user.id).all()
    months = defaultdict(int)
    for r in reservations:
        if r.booking_date:
            month = r.booking_date.strftime('%b %Y')
            months[month] += 1
    sorted_months = sorted(months.items(), key=lambda x: datetime.strptime(x[0], "%b %Y"))
    result = [{'month': m, 'count': c} for m, c in sorted_months]
    return jsonify({'months': result})



@api_bp.route('/user/status_breakdown_chart', methods=['GET'])
@login_required
def user_status_breakdown_chart():
    reservations = Reservation.query.filter_by(user_id=current_user.id).all()
    status_counts = {}
    for r in reservations:
        status = r.status.capitalize()
        status_counts[status] = status_counts.get(status, 0) + 1
    return jsonify({'status': status_counts})



@api_bp.route('/celery')
def celery():
    from backend.apps_celery.tasks import add  # Import inside function
    task = add.delay(10, 20)
    return {'task_id': task.id}