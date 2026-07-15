package com.getcapacitor.myapp;

import android.os.Bundle;
import android.widget.FrameLayout;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Initialize the Google Mobile Ads SDK
        MobileAds.initialize(this, initializationStatus -> {});

        // Set up native banner ad in the left container
        FrameLayout adContainer = findViewById(R.id.ad_view_container);
        if (adContainer != null) {
            AdView adView = new AdView(this);
            adView.setAdUnitId("ca-app-pub-9588771232078352/8926073256"); // Your production Unit ID
            adView.setAdSize(AdSize.getLargeAnchoredAdaptiveBannerAdSize(this, 320));
            adContainer.addView(adView);

            AdRequest adRequest = new AdRequest.Builder().build();
            adView.loadAd(adRequest);
        }
    }
}
