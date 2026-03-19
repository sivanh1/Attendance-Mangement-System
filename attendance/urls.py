from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register_view, name='register'),
    path('user/', views.user_dashboard, name='user_dashboard'),
    path('admin-panel/', views.admin_dashboard, name='admin_dashboard'),
    path('mark-attendance/', views.mark_attendance, name='mark_attendance'),
    path('submit-leave/', views.submit_leave, name='submit_leave'),
    path('submit-wfh/', views.submit_wfh, name='submit_wfh'),
    path('leave/<int:pk>/<str:action>/', views.action_leave, name='action_leave'),
    path('wfh/<int:pk>/<str:action>/', views.action_wfh, name='action_wfh'),
    path('settings/', views.system_settings, name='system_settings'),
]
