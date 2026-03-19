from django.db import models
from django.contrib.auth.models import User
from datetime import timedelta, datetime


class SystemSettings(models.Model):
    current_date = models.DateField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"System Date: {self.current_date}"


class Attendance(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('wfh', 'Work From Home'),
        ('leave', 'On Leave'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    # ← Changed from auto_now_add=True to default=datetime.now
    # auto_now_add always saves UTC and ignores any value passed in views.py
    # default=datetime.now uses the real local system time and allows override
    marked_at = models.DateTimeField(default=datetime.now)

    class Meta:
        unique_together = ('user', 'date')

    def __str__(self):
        return f"{self.user.username} - {self.date} - {self.status}"


class LeaveRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leave_requests')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    actioned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='leave_actions'
    )
    actioned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=datetime.now)

    def date_range(self):
        days = (self.end_date - self.start_date).days + 1
        return [self.start_date + timedelta(days=i) for i in range(days)]

    @property
    def num_days(self):
        return (self.end_date - self.start_date).days + 1

    def __str__(self):
        return f"{self.user.username} Leave: {self.start_date} to {self.end_date} ({self.status})"


class WFHRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wfh_requests')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    actioned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='wfh_actions'
    )
    actioned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=datetime.now)

    def date_range(self):
        days = (self.end_date - self.start_date).days + 1
        return [self.start_date + timedelta(days=i) for i in range(days)]

    @property
    def num_days(self):
        return (self.end_date - self.start_date).days + 1

    def __str__(self):
        return f"{self.user.username} WFH: {self.start_date} to {self.end_date} ({self.status})"