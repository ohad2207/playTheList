plugins { id("com.android.application") }
android {
  namespace = "com.playthelist.app"
  compileSdk = 35
  defaultConfig { applicationId = "com.playthelist.app"; minSdk = 24; targetSdk = 34; versionCode = 1; versionName = "1.0"
    buildConfigField("String", "SERVER_URL", "\"${project.findProperty("SERVER_URL") ?: ""}\"") }
  buildFeatures { buildConfig = true }
  compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}
