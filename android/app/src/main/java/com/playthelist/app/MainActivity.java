package com.playthelist.app;
import android.app.*;import android.content.*;import android.os.*;import android.webkit.*;import android.widget.EditText;
public class MainActivity extends Activity {
  WebView w; SharedPreferences sp;
  @Override protected void onCreate(Bundle b){
    super.onCreate(b);
    sp=getSharedPreferences("p",0);
    w=new WebView(this);setContentView(w);
    WebSettings s=w.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setMediaPlaybackRequiresUserGesture(false);
    CookieManager.getInstance().setAcceptCookie(true);
    w.setWebChromeClient(new WebChromeClient());
    w.setWebViewClient(new WebViewClient(){
      @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())ask("לא ניתן להתחבר. בדקו את הכתובת:");}
    });
    if(Build.VERSION.SDK_INT>=33)requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},1);
    startForegroundService(new Intent(this,PlayService.class));
    String u=sp.getString("url",null);
    if(u==null)ask("כתובת השרת (למשל http://192.168.1.20:3000):");else w.loadUrl(u);
  }
  void ask(String msg){
    EditText t=new EditText(this);t.setText(sp.getString("url","http://"));t.setSingleLine();
    new AlertDialog.Builder(this).setTitle("playTheList").setMessage(msg).setView(t).setCancelable(false)
      .setPositiveButton("התחבר",(d,i)->{String u=t.getText().toString().trim();if(!u.startsWith("http"))u="http://"+u;sp.edit().putString("url",u).apply();w.loadUrl(u);}).show();
  }
  @Override public void onBackPressed(){if(w.canGoBack())w.goBack();else moveTaskToBack(true);}
  // בכוונה לא קוראים ל-w.onPause() כדי שהמוזיקה תמשיך ברקע
}
