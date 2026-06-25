import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'auth/auth_controller.dart';
import 'config/api_config.dart';

const kOnboardingDoneKey = 'mangafriq_reader_onboarding_v1';

final StartupController appStartup = StartupController();

class StartupController extends ChangeNotifier {
  StartupController();

  bool _ready = false;
  bool _onboardingDone = false;

  bool get ready => _ready;
  bool get onboardingDone => _onboardingDone;

  Future<void> init() async {
    if (_ready) return;
    await ApiConfig.loadSavedBaseUrl();
    await authController.load();
    final sp = await SharedPreferences.getInstance();
    _onboardingDone = sp.getBool(kOnboardingDoneKey) ?? false;
    _ready = true;
    notifyListeners();
  }

  Future<void> setOnboardingDone() async {
    final sp = await SharedPreferences.getInstance();
    await sp.setBool(kOnboardingDoneKey, true);
    _onboardingDone = true;
    notifyListeners();
  }
}
