var EXTENSION_INSTALLED_FROM_STORE_KEY = "installedFromStore";
var EXTENSION_HAS_SHOWN_INSTALL_WINDOW = "hasShownInstallWindow";
var EXTENSION_CONNECTED_TO_NATIVE_HOST = "hasConnectedToHost";

function FdmExtension()
{
    this.installationManagerStart();

    this.nhManager = new FdmNativeHostManager;
    this.nhManager.onReady = this.onNativeHostReady.bind(this);
    this.nhManager.onNativeHostNotFound = this.onNativeHostNotFound.bind(this);

    this.nhManager.onGotSettings = this.onGotSettings.bind(this);
    this.nhManager.onGotKeyState = this.onGotKeyState.bind(this);    

    this.tabsManager = new TabsManager(this.nhManager);

    this.cmManager = new FdmContextMenuManager(this.tabsManager);
    this.cmManager.setNativeHostManager(this.nhManager);

    this.settingsPageHlpr = new FdmSettingsPageHelper(this.nhManager, this);

    this.diManager = new FdmDownloadsInterceptManager(this.settingsPageHlpr, this.tabsManager);
    this.diManager.setNativeHostManager(this.nhManager);

    this.fdmSchemeHandler = new FdmSchemeHandler(this.nhManager);

    this.ntwrkMon = new FdmNetworkRequestsMonitor(this.nhManager);

    // this.videoBtn = new FdmVideoBtn(this.nhManager);
}

FdmExtension.prototype.initialize = function()
{
    this.nhManager.onInitialized = this.nhManagerInitialized.bind(this);
    this.nhManager.initialize();
};

FdmExtension.prototype.nhManagerInitialized = function()
{
    this.buildVersion = fdmExtUtils.parseBuildVersion(this.nhManager.handshakeResp.version);
    this.diManager.initialize();
    this.fdmSchemeHandler.initialize();
    this.ntwrkMon.initialize();
    this.tabsManager.initialize();
    // this.videoBtn.initialize();
    this.settingsPageHlpr.initialize();
};

FdmExtension.prototype.onNativeHostReady = function()
{
    this.onConnectedToNativeHost();

    this.nhManager.postMessage(
        new FdmBhUiStringsTask,
        this.onGotUiStrings.bind(this));

    this.nhManager.postMessage(
        new FdmBhQuerySettingsTask,
        this.onGotSettings.bind(this));

    this.nhManager.postMessage(
        new FdmBhKeyStateTask,
        this.onGotKeyState.bind(this));    
};

FdmExtension.prototype.onGotSettings = function(resp)
{
    this.settings = resp.settings;

    this.cmManager.createMenu(
        this.settings.browser.menu.dllink != "0",
        this.settings.browser.menu.dlall != "0",
        this.settings.browser.menu.dlselected != "0",
        this.settings.browser.menu.dlpage != "0",
        this.settings.browser.menu.dlvideo != "0",
        this.settings.browser.menu.dlYtChannel != "0",
        this.buildVersion && 
            (  parseInt(this.buildVersion.version) > 5 
            || parseInt(this.buildVersion.version) === 5 && parseInt(this.buildVersion.build) >= 7192 
            || parseInt(this.buildVersion.build) === 0)
        );

    this.diManager.enable = this.settings.browser.monitor.enable != "0";
    this.diManager.skipSmaller = Number(this.settings.browser.monitor.skipSmallerThan);
    this.diManager.skipExts = this.settings.browser.monitor.skipExtensions.toLowerCase();
    if (this.settings.browser.monitor.hasOwnProperty("catchExtensions"))
        this.diManager.catchExts = this.settings.browser.monitor.catchExtensions.toLowerCase();
    this.diManager.skipServersEnabled = this.settings.browser.monitor.skipServersEnabled === "1";
    this.diManager.skipHosts = fdmExtUtils.skipServers2array(this.settings.browser.monitor.skipServers);
    this.diManager.allowBrowserDownload = this.settings.browser.monitor.allowDownload != "0";
    this.diManager.skipIfKeyPressed = this.settings.browser.monitor.skipIfKeyPressed != "0";
};

FdmExtension.prototype.onGotKeyState = function(resp)
{
    this.diManager.skipKeyPressed = resp.pressed;
};

FdmExtension.prototype.updateSettings = function(resp)
{
    this.nhManager.postMessage(
        new FdmBhQuerySettingsTask,
        this.onGotSettings.bind(this));
};

FdmExtension.prototype.onGotUiStrings = function(resp)
{
    this.uiStrings = resp.strings;
};

FdmExtension.prototype.onNativeHostNotFound = function()
{
    if (this.installationManagerEnabled && this.shouldShowInstallationWindow()) {
        this.setShownInstallationWindow(true);
        this.showFdmInstallationWindow();
    }
};

FdmExtension.prototype.showFdmInstallationWindow = function()
{
    browser.windows.create(
        {
            'url': "chrome-extension://" + browser.i18n.getMessage("@@extension_id") + "/src/html/install.html",
            'type': 'popup',
            'width': 740,
            'height': 500
        });
};

FdmExtension.prototype.onInitialInstall = function()
{
    // Restart Native Host initialization
    this.nhManager.restartIfNeeded();
};

FdmExtension.prototype.installationManagerStart = function()
{
    if (window.browserName == "Chrome") {
        this.installationManagerEnabled = true;

        this.installedFromStore = false;
        this.hasShownInstallWindow = false;
        this.hasConnectedToHost = false;

        this.setDefaultsIfNotPresent();
        this.installationManagerInitialize();
    } else {
        this.installationManagerEnabled = false;
    }
};

FdmExtension.prototype.installationManagerInitialize = function()
{
    browser.storage.local.get(null, this.onRetrievedLocalStorage.bind(this));
};

FdmExtension.prototype.onInstalled = function(details)
{
    if (!this.installationManagerEnabled) {
        return;
    }

    console.log('onInstalled reason: ' + details['reason']);

    // 1. If this is a first-time installation
    var reason = details['reason'];

    switch (reason)
    {
        case "install":
            // Find chrome url in history and set local storage value
            browser.management.getSelf(function(extensionInfo) {

                var installed_from_store = false;

                browser.tabs.query({}, function (tabs) {

                    if (tabs && tabs.length){

                        for (var i =0; i < tabs.length; i++){

                            var url = tabs[i].url;
                            if (url.indexOf("chromewebstore.google.com") >= 0
                                || url.indexOf(extensionInfo.id) >= 0)
                            {
                                installed_from_store = true;
                                break;
                            }
                        }
                    }

                    if (installed_from_store){

                        this.setInstalledFromStore(true);
                        this.onInitialInstall();
                    }
                    else{

                        browser.history.search({text: '', maxResults: 3}, function(pages) {

                            if (pages.length > 0)
                            {
                                for (var i =0; i < pages.length; i++){

                                    var url = pages[i].url;
                                    if (url.indexOf("chromewebstore.google.com") >= 0
                                        || url.indexOf(extensionInfo.id) >= 0)
                                    {
                                        installed_from_store = true;
                                        break;
                                    }
                                }
                            }

                        }.bind(this));

                        if (installed_from_store)
                            this.setInstalledFromStore(true);

                        this.onInitialInstall();
                    }

                }.bind(this));

            }.bind(this));

            break;
        case "update":
            // Set local value to false, and set to true on getting a handshake from host
            this.setDefaultsIfNotPresent();
            break;
        default:
            break;
    }
};

FdmExtension.prototype.setDefaultsIfNotPresent = function()
{
    browser.storage.local.get(null, function(items) {

        if (browser.runtime.lastError)
        {
            console.log("Error getting current local values, expect errors...");
            console.log(browser.runtime.lastError);
            return;
        }

        var currentFromStore = items[EXTENSION_INSTALLED_FROM_STORE_KEY];
        if (currentFromStore == null || (typeof currentFromStore == 'undefined'))
        {
            this.setInstalledFromStore(false);
        }

        var currentShownInstallWindow = items[EXTENSION_HAS_SHOWN_INSTALL_WINDOW];
        if (currentShownInstallWindow == null || (typeof currentShownInstallWindow == 'undefined'))
        {
            this.setShownInstallationWindow(false);
        }

        var currentHasConnectedToHost = items[EXTENSION_CONNECTED_TO_NATIVE_HOST];
        if (currentHasConnectedToHost == null || (typeof currentHasConnectedToHost == 'undefined'))
        {
            this.setHasConnectedToNativeHost(false);
        }

    }.bind(this));
};

FdmExtension.prototype.setInstalledFromStore = function(value)
{
    this.installedFromStore = value;
    this.setLocalStorageValue(EXTENSION_INSTALLED_FROM_STORE_KEY, value);
};

FdmExtension.prototype.setShownInstallationWindow = function(value)
{
    this.hasShownInstallWindow = value;
    this.setLocalStorageValue(EXTENSION_HAS_SHOWN_INSTALL_WINDOW, value);
};

FdmExtension.prototype.setHasConnectedToNativeHost = function(value)
{
    this.hasConnectedToHost = value;
    this.setLocalStorageValue(EXTENSION_CONNECTED_TO_NATIVE_HOST, value);
};

FdmExtension.prototype.setLocalStorageValue = function(key, value)
{
    var newValue = {};
    newValue[key] = value;

    browser.storage.local.set(newValue, this.handleStorageErrors.bind(this));
};

FdmExtension.prototype.onConnectedToNativeHost = function()
{
    if (this.installationManagerEnabled) {
        // We detected a native host, thus set sync/local storage values as if we are the initiator
        this.setHasConnectedToNativeHost(true);
    }
};

FdmExtension.prototype.handleStorageErrors = function()
{
    if (browser.runtime.lastError)
    {
        console.log('Error with storage operation:');
        console.log(browser.runtime.lastError.message);
    }
};

FdmExtension.prototype.onRetrievedLocalStorage = function(items)
{
    var currentFromStore = items[EXTENSION_INSTALLED_FROM_STORE_KEY];
    if (!(currentFromStore == null || (typeof currentFromStore == 'undefined')))
    {
        this.installedFromStore = currentFromStore;
    }

    var currentShownInstallWindow = items[EXTENSION_HAS_SHOWN_INSTALL_WINDOW];
    if (!(currentShownInstallWindow == null || (typeof currentShownInstallWindow == 'undefined')))
    {
        this.hasShownInstallWindow = currentShownInstallWindow;
    }

    var currentHasConnectedToHost = items[EXTENSION_CONNECTED_TO_NATIVE_HOST];
    if (!(currentHasConnectedToHost == null || (typeof currentHasConnectedToHost == 'undefined')))
    {
        this.hasConnectedToHost = currentHasConnectedToHost;
    }
};

FdmExtension.prototype.shouldShowInstallationWindow = function()
{
    return !this.hasConnectedToHost && !this.hasShownInstallWindow && this.installedFromStore;
};

