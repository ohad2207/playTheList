package com.playthelist.app;
import android.app.*;import android.content.*;import android.content.pm.ServiceInfo;import android.os.*;
public class PlayService extends Service {
  PowerManager.WakeLock wl;
  @Override public IBinder onBind(Intent i){return null;}
  @Override public int onStartCommand(Intent i,int f,int id){
    NotificationManager nm=getSystemService(NotificationManager.class);
    nm.createNotificationChannel(new NotificationChannel("play","playTheList",NotificationManager.IMPORTANCE_LOW));
    PendingIntent pi=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE);
    Notification n=new Notification.Builder(this,"play").setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle("playTheList").setContentText("פועל ברקע").setContentIntent(pi).setOngoing(true).build();
    if(Build.VERSION.SDK_INT>=29)startForeground(1,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);else startForeground(1,n);
    if(wl==null){wl=getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"playTheList:play");wl.acquire();}
    return START_STICKY;
  }
  @Override public void onDestroy(){if(wl!=null&&wl.isHeld())wl.release();super.onDestroy();}
}
