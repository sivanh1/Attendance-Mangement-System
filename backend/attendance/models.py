from django.db import models
from django.contrib.auth.models import User
from datetime import date, timedelta


class SystemSettings(models.Model):
    current_date = models.DateField(default=date.today)

    class Meta:
        verbose_name_plural = 'System Settings'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_system_date(cls):
        obj, _ = cls.objects.get_or_create(pk=1, defaults={'current_date': date.today()})
        return obj.current_date

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
    marked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']

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
    reason = models.CharField(max_length=200)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    actioned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='actioned_leaves'
    )
    actioned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def num_days(self):
        return (self.end_date - self.start_date).days + 1

    def date_range(self):
        days = (self.end_date - self.start_date).days + 1
        return [self.start_date + timedelta(days=i) for i in range(days)]

    def __str__(self):
        return f"{self.user.username} - {self.start_date} ({self.status})"


class WFHRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wfh_requests')
    start_date = models.DateField(default='2026-01-01')  
    end_date = models.DateField(default='2026-01-01')    
    reason = models.CharField(max_length=200)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    actioned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='actioned_wfhs'
    )
    actioned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def num_days(self):
        return (self.end_date - self.start_date).days + 1

    def date_range(self):
        days = (self.end_date - self.start_date).days + 1
        return [self.start_date + timedelta(days=i) for i in range(days)]

    def __str__(self):
        return f"{self.user.username} WFH: {self.start_date} to {self.end_date} ({self.status})"