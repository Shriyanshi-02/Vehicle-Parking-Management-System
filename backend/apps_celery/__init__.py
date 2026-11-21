# filepath: d:\VP_App\backend\apps_celery\__init__.py
from celery import Celery
from celery.schedules import crontab

def create_celery_app():
    from app import app  # Import Flask app to avoid circular imports

    celery_app = Celery(app.import_name)
    celery_app.conf.update(
        broker_url='redis://localhost:6379/0',
        result_backend='redis://localhost:6379/1',
        timezone='Asia/Kolkata',
        include=['backend.apps_celery.tasks'],  # Explicitly include the tasks module
        beat_schedule={
            'send-parking-reminders': {
                'task': 'backend.apps_celery.tasks.send_parking_reminders',
                'schedule': crontab(minute='*'),  # every minute
            },
            'send-monthly-report': {
                'task': 'backend.apps_celery.tasks.send_monthly_reports',
                'schedule': crontab(minute=0, hour=0, day_of_month=1),  # 1st of every month at 00:00
            },
        }
    )

    class ContextTask(celery_app.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery_app.Task = ContextTask
    return celery_app

celery_app = create_celery_app()