if (typeof window === 'undefined') {
    var window = self;
}

window.browser = (function ()
{
  return window.msBrowser ||
    window.browser ||
    window.chrome;
})();

window.browserName = (function()
{
    if (window.msBrowser)
        return "Edge";
    if (window.browser && typeof InstallTrigger !== 'undefined')
        return "Firefox";
    if (window.navigator.userAgent.toLowerCase().includes('firefox'))
        return "Firefox";
    return "Chrome";
})();

// let browser = window.browser;
// if (typeof browser === 'undefined' && typeof window !== 'undefined') {
    var browser = window.browser;
// }

async function startTimerAlarm(name, delayInMsec, callback) {
    if (delayInMsec >= 30000) {
        await browser.alarms.create(name, { when: (Date.now() + delayInMsec) }, callback);
    } else {
        await browser.alarms.create(name, { when: (Date.now() + delayInMsec) });
    }
}


var fdmExtUtils = {
    getHostFromUrl: function (url) {
        return url.toString().replace(/^.*\/\/(www\.)?([^\/?#:]+).*$/, '$2').toLowerCase();
    },
    normalizeRedirectURL: function (urlRedirect, url) {
        if (urlRedirect.indexOf('//') === 0 && urlRedirect.indexOf('.') > 0){

            var protocolPos = url.indexOf('//');
            return url.substring(0, protocolPos) + urlRedirect;
        }

        if (urlRedirect.lastIndexOf('.') > 0)
        {
            var protocolPos = url.indexOf('//');
            return url.substring(0, protocolPos + 2) + urlRedirect;
        }

        var redirectRequest = urlRedirect.indexOf('?');

        if (redirectRequest === 0){

            var urlQuery = url.indexOf('?');
            if (urlQuery >= 0)
                return url.substring(0, urlQuery) + urlRedirect;
            else
                return url + urlRedirect;
        }

        var lastDot = url.lastIndexOf('.');

        var baseUrl = url;
        var firstSlash = url.indexOf('/', lastDot);
        if (firstSlash >= 0)
            baseUrl = url.substring(0, firstSlash);

        var firstRequestSlash = urlRedirect.indexOf('/');

        if (firstRequestSlash === 0)
            return baseUrl + urlRedirect;
        else
            return baseUrl + '/' + urlRedirect;
    },
    skipServers2array: function (skipServers) {
        if (typeof skipServers === 'string') {
            return skipServers.trim().toLowerCase().split(' ');
        }
        return [];
    },
    skipServers2string: function (skipServers) {
        if (typeof skipServers === 'object') {
            return skipServers.join(" ");
        }
        return "";
    },
    urlInSkipServers: function (skipServers, url) {
        var skip = false;
        if (typeof skipServers === 'object' && typeof skipServers.forEach === "function") {
            var host = fdmExtUtils.getHostFromUrl(url);
            skipServers.forEach(function (hostToSkip) {
                var domainWithSubdomains = new RegExp('^(?:[\\w\\d\\.]*\\.)?' + hostToSkip + '$', 'i');
                if (domainWithSubdomains.test(host)) {
                    skip = true;
                }
            });
        }
        return skip;
    },
    addUrlToSkipServers: function (skipServers, url) {
        if (fdmExtUtils.urlInSkipServers(skipServers, url)) {
            return skipServers;
        }
        var host = fdmExtUtils.getHostFromUrl(url);
        skipServers.push(host);
        return skipServers;
    },
    removeUrlFromSkipServers: function (skipServers, url) {
        if (typeof skipServers === 'object' && typeof skipServers.forEach === "function") {
            var host = fdmExtUtils.getHostFromUrl(url);
            for (var i = skipServers.length - 1; i >= 0; i--) {
                var hostToSkip = skipServers[i];
                var domainWithSubdomains = new RegExp('^(?:[\\w\\d\\.]*\\.)?' + hostToSkip + '$', 'i');
                if (domainWithSubdomains.test(host)) {
                    skipServers.splice(i,1);
                }
            }
        }
        return skipServers;
    },
    parseBuildVersion: function (version) {
        var result = {
            version: version,
            build: "1", // "0" - developer build
            old: true,
            develop: false
        };
        if (typeof version === 'string') {
            var m = version.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/i);
            if (m && m.length >= 5) {
                result.build = m[4];
                result.old = false;
                result.develop = m[4] === "0";
            }
        }
        return result;
    }
};

function DownloadInfo(url, redirectUrl, referrer, postData, documentUrl)
{
    if (url && redirectUrl)
    {
        this.url = redirectUrl;
        this.originalUrl = url;
    }
    else
    {
        this.url = url || "";
        this.originalUrl = this.url;
    }
    
    this.httpReferer = referrer;
    this.httpPostData = postData;
    this.documentUrl = documentUrl;

    //this.userAgent = "";
    //this.httpCookies = "";
    //this.suggestedName = "";
}


try
{
    exports.DownloadInfo = DownloadInfo;
}
catch (e) {}
function RequestsManager ()
{
    this.idsAsStrings = true;
    this.nextReqId = 1;
    this.requestsInProgress = new Map;
    
    this.assignRequestId = function (req)
    {
        req.id = this.nextReqId++;
        if (this.idsAsStrings)
            req.id = req.id.toString();		
    };
    
    this.performRequest = function (req, callback)
    {
        if (!req.id || req.id == "0")
            this.assignRequestId (req);
            
        if (callback)
            this.requestsInProgress.set(req.id, callback);
            
        this.sendRequest (req);
    };
    
    this.sendRequest = function (req)
    {
        throw "pure function call";
    };
    
    this.onRequestResponse = function (resp)
    {
        var callback = this.requestsInProgress.get (resp.id);
        this.requestsInProgress.delete(resp.id);
        if (callback)
            callback(resp);
    };
    
    this.closeRequestsInProgress = function (callback)
    {
        this.requestsInProgress.forEach (function (val, key, map)
        {
            map.delete (key);
            if (callback)
                callback (key, val);
        });
    };
}



try
{
    exports.RequestsManager = RequestsManager;
}
catch (e) {}
function CookieManager()
{

}

CookieManager.prototype.getCookiesForUrl = function(
    url, callback)
{
    this.getCookiesForUrls([url], function (result)
    {
        callback(result[0]);
    });
}

CookieManager.prototype.getCookiesForUrls = function(
    urls, callback)
{
    var remained = urls.length;
    var result = [];

    for (var i = 0; i < urls.length; ++i)
    {
        browser.cookies.getAll(
            { 'url': urls[i] },
            function (resultIndex, cookies)
            {
                var cookiesString = "";
                if (cookies)
                {
                    cookiesString = cookies.map(function (cookie) {
                        return cookie.name + "=" + cookie.value + ";";
                    }).join(' ');
                }
                result[resultIndex] = cookiesString;
                if (!--remained)
                    callback(result);
            }.bind(this, i));
    }
}
function FdmBhIpcTask (id, type)
{
    this.id = id || 0;
    this.type = type || "";
    if (typeof this.id == "number")
        this.id = this.id.toString ();
}

function FdmBhHandshakeTask (id)
{
    FdmBhIpcTask.call (this, id, "handshake");
    this.handshake = new Object;
    this.handshake.api_version = "1";
    this.handshake.browser = window.browserName;
}

function FdmBhUiStringsTask (id)
{
    FdmBhIpcTask.call (this, id, "ui_strings");
}

function FdmBhQuerySettingsTask (id)
{
    FdmBhIpcTask.call (this, id, "query_settings");
}

function FdmBhPostSettingsTask (id)
{
    FdmBhIpcTask.call (this, id, "post_settings");

    this.setSettings = function(s)
    {
    	this.post_settings = s;
    };
}

function FdmBhJsonTask (id)
{
    FdmBhIpcTask.call (this, id, "fdm_json_task");

    this.setJson = function(obj)
    {
    	this.json = JSON.stringify(obj);
    };
}

function FdmBhShutdownTask (id)
{
    FdmBhIpcTask.call (this, id, "shutdown");
}

function FdmBhCreateDownloadsTask (id)
{
    FdmBhIpcTask.call (this, id, "create_downloads");
    
    this.create_downloads = new Object;
    this.create_downloads.downloads = [];

    this.addDownload = function (download)
    {
        if (!download instanceof DownloadInfo)
            throw "invalid type";
        this.create_downloads.downloads.push (download);
    };
    
    this.hasDownloads = function ()
    {
        return this.create_downloads.downloads.length != 0;
    };
}

function FdmBhBrowserProxyTask (id)
{
    FdmBhIpcTask.call (this, id, "browser_proxy");
    
    this.setProxy = function (proxy)
    {
        this.browser_proxy = new Object;
        this.browser_proxy.type = proxy.type.toString();
        this.browser_proxy.protocol = proxy.protocol;
        this.browser_proxy.addr = proxy.addr;
        this.browser_proxy.port = proxy.port.toString();
    };
}

function FdmBhWindowTask (id)
{
    FdmBhIpcTask.call (this, id, "window");
    this.window = new Object;
    
    this.showWindow = function (handle, show, needWait)
    {
        this.window.windowHandle = handle;
        this.window.action = show ? "show" : "hide";
        this.window.needWait = needWait ? "1" : "0";
    };
}

function FdmBhVideoSnifferTask (id)
{
    FdmBhIpcTask.call (this, id, "video_sniffer");
    
    this.setRequest = function (req)
    {
        this.video_sniffer = req;
    };
}

function FdmBhSniffDllIsVideoFlashRequest(
	webPageUrl, frameUrl, swfUrl,
	flashVars, otherSwfUrls, otherFlashVars)
{
    this.name = "IsVideoFlash";
    this.webPageUrl = webPageUrl;
    this.frameUrl = frameUrl;
    this.swfUrl = swfUrl;
    this.flashVars = flashVars;
    this.otherSwfUrls = otherSwfUrls;
    this.otherFlashVars = otherFlashVars;
}

function FdmBhSniffDllCreateVideoDownloadFromUrlRequest(
	webPageUrl, frameUrl, swfUrl,
	flashVars, otherSwfUrls, otherFlashVars)
{
    this.name = "CreateVideoDownloadFromUrl";
    this.webPageUrl = webPageUrl;
    this.frameUrl = frameUrl;
    this.swfUrl = swfUrl;
    this.flashVars = flashVars;
    this.otherSwfUrls = otherSwfUrls;
    this.otherFlashVars = otherFlashVars;
}

function FdmBhNetworkRequestNotification (id, type)
{
    FdmBhIpcTask.call (this, id, "network_request_notification");
    this.network_request_notification = new Object;
    this.network_request_notification.type = type;
}

function FdmBhNewNetworkRequestNotification (id)
{
    FdmBhNetworkRequestNotification.call (this, id, "new");
    
    this.setInfo = function (url, srcTabUrl)
    {
        this.network_request_notification.url = url;
        this.network_request_notification.srcTabUrl = srcTabUrl;
    };
}

function FdmBhNetworkRequestActivityNotification (id)
{
    FdmBhNetworkRequestNotification.call (this, id, "activity");
    
    this.setInfo = function (url)
    {
        this.network_request_notification.url = url;
    };
}

function FdmBhNetworkRequestResponseNotification (id)
{
    FdmBhNetworkRequestNotification.call (this, id, "response");
    
    this.setInfo = function (requestId, url, requestHeaders, responseHeaders)
    {
        this.network_request_notification.requestId = requestId;
        this.network_request_notification.url = url;
        this.network_request_notification.requestHeaders = requestHeaders;
        this.network_request_notification.responseHeaders = responseHeaders;
    };
}

function FdmBhNetworkRequestResponseDataNotification (id)
{
    FdmBhNetworkRequestNotification.call (this, id, "response_data");
    
    this.setInfo = function (requestId, data)
    {
        this.network_request_notification.requestId = requestId;
        this.network_request_notification.data = data;
    };
}

function FdmBhNetworkRequestResponseCompleteNotification (id)
{
    FdmBhNetworkRequestNotification.call (this, id, "response_complete");
    
    this.setInfo = function (requestId)
    {
        this.network_request_notification.requestId = requestId;
    };
}

function FdmBhBrowserDownloadStateReport (id)
{
    FdmBhIpcTask.call (this, id, "browser_download_state_report");
    this.browser_download_state_report = new Object;
    
    this.setInfo = function (url, state)
    {
        this.browser_download_state_report.url = url;
        this.browser_download_state_report.state = state;
    };
}

function FdmBhKeyStateTask (id)
{
    FdmBhIpcTask.call (this, id, "key_state");
}

// "request" = "task" = "message" :)

function FdmNativeHostManager()
{
    this.portFailed = false;
    this.legacyPort = false;
    this.hasNativeHost = false;
    this.ready = false;
    this.scheduledRequests = new Array;
    this.requestsManager = new RequestsManager;
    this.handshakeResp = {};
    this.requestsManager.sendRequest = function(req)
    {
        this.port.postMessage(req);
    }.bind (this);
}

FdmNativeHostManager.prototype.restartIfNeeded = function()
{
    console.log("restart if needed + " + this.portFailed);
    if (this.portFailed)
        this.initialize();
};

FdmNativeHostManager.prototype.initialize = function()
{
    this.port = browser.runtime.connectNative('org.freedownloadmanager.fdm5.cnh');
    this.port.onMessage.addListener(
        this.onPortMessage.bind(this));
    this.port.onDisconnect.addListener(
        this.onPortDisconnect.bind(this));
    this.requestsManager.performRequest(
        new FdmBhHandshakeTask(),
        this.onGotHandshake.bind(this)
    );
}

FdmNativeHostManager.prototype.onGotHandshake = function(resp)
{
    if (resp.error)
        return;

    this.ready = true;
    this.onReady();
    for (var i = 0; i < this.scheduledRequests.length; i++)
        this.postMessage(this.scheduledRequests[i].task, this.scheduledRequests[i].callback);
    this.scheduledRequests = [];
    this.handshakeResp = resp;

    if (typeof this.onInitialized == 'function')
        this.onInitialized();
}

FdmNativeHostManager.prototype.onGotSettings = function(resp)
{

}

FdmNativeHostManager.prototype.onGotKeyState = function(resp)
{

}


FdmNativeHostManager.prototype.onReady = function()
{

}

FdmNativeHostManager.prototype.onPortMessage = function(msg)
{
    this.portFailed = false;

    this.hasNativeHost = true;
    
    if (!msg.id)
    {
        if (msg.type == "query_settings")
            this.onGotSettings(msg);
        else if (msg.type == "key_state")
            this.onGotKeyState(msg);
        return;
    }

    this.requestsManager.onRequestResponse(msg);
}

FdmNativeHostManager.prototype.onPortDisconnect = function(msg)
{
    this.portFailed = true;

    var errmsg = "";
    try {
        errmsg = browser.runtime.lastError.message;
    } catch (e) { }
    var tryLegacy = false;

    console.log(errmsg);

    if (errmsg.indexOf("Access") != -1)
    {
        console.log(browser.i18n.getMessage("installCorrupted"));
    }
    else if (errmsg.indexOf("not found") != -1)
    {
        tryLegacy = true;
    }
    else
    {
        console.log(browser.i18n.getMessage("installUnknownError") + "\n" + errmsg);
        if (!this.hasNativeHost)
            tryLegacy = true;
    }
    this.closeRequestsInProgress();
    if (tryLegacy)
        this.initializeLegacy();
}

FdmNativeHostManager.prototype.closeRequestsInProgress = function()
{
    this.requestsManager.closeRequestsInProgress(
        function (id, callback)
    {
        if (callback)
        {
            var resp = new Object;
            resp.id = id;
            resp.error = "ipc failure";
            callback (resp);
        }				
    });
}

FdmNativeHostManager.prototype.initializeLegacy = function()
{
    this.legacyPort = true;
    this.requestsManager.idsAsStrings = false;
    this.port = browser.runtime.connectNative('com.vms.fdm');

    this.port.onMessage.addListener(
        this.onLegacyPortMessage.bind(this));
    this.port.onDisconnect.addListener(
        this.onLegacyPortDisconnect.bind(this));
}

FdmNativeHostManager.prototype.onLegacyPortMessage = function(msg)
{
    this.hasNativeHost = true;

    switch (msg.id)
    {
        case -2:  // initialization
            this.onGotLegacySettings(msg);
            if (!this.ready)
                this.onGotHandshake({ error: "" });
            break;

        case -1:  // [download from(?)] menu
            break;

        default:
            this.requestsManager.onRequestResponse(msg);
            break;
    }
}

FdmNativeHostManager.prototype.onGotLegacySettings = function(msg)
{
    this.legacySettings = {
        id: "",
        type: "query_settings",
        error: "",
        result: "",
        settings: {
            browser: {
                menu: {
                    dllink: msg.result.menu._this.toString(),
                    dlall: msg.result.menu.all.toString(),
                    dlselected: msg.result.menu.selected.toString(),
                    dlvideo: msg.result.menu.flash_video.toString(),
                    dlpage: msg.result.menu.page.toString()
                },
                monitor: {
                    enable: msg.result.monitor.toString(),
                    allowDownload: msg.result.allow_download.toString(),
                    skipSmallerThan: msg.result.skip_smaller.toString(),
                    skipExtensions: msg.result.skip_extensions || "",
                    skipServersEnabled: "1"
                }
            }
        }
    };

    if (this.ready)
        this.onGotSettings(this.legacySettings);
}

FdmNativeHostManager.prototype.onLegacyPortDisconnect = function(msg)
{
    this.portFailed = true;
    
    var errmsg = "";
    try {
        errmsg = browser.runtime.lastError.message;
    }catch(e) {}
    if (errmsg.indexOf("Access") != -1)
    {
        console.log(browser.i18n.getMessage("installCorrupted"));
    }
    else if (errmsg.indexOf("not found") != -1)
    {
        console.log(browser.i18n.getMessage("installMissing"));
        this.onNativeHostNotFound();
    }
    else 
    {
        console.log(browser.i18n.getMessage("installUnknownError"));
    }
}

FdmNativeHostManager.prototype.onNativeHostNotFound = function()
{
    
}

FdmNativeHostManager.prototype.postMessage = function(task, callback)
{
    if (this.ready)
    {
        if (this.legacyPort)
            this.postLegacyMessage(task, callback);
        else
            this.requestsManager.performRequest(task, callback);
    }
    else
    {
        var o = new Object;
        o.task = task;
        o.callback = callback;
        this.scheduledRequests.push(o);
    }
}

FdmNativeHostManager.prototype.postLegacyMessage = function(task, callback)
{
    if (task.type == "query_settings")
    {
        callback(this.legacySettings);
    }
    else if (task.type == "ui_strings")
    {
        callback({
            error: "",
            strings: {}
        });
    }
    else if (task.type == "create_downloads")
    {
        var legacyUrl = task.create_downloads.downloads[0].url;
        for (var i = 1; i < task.create_downloads.downloads.length; ++i)
            legacyUrl += "\n" + task.create_downloads.downloads[i].url;

        var legacyTask = {
            id: 0,
            list: task.create_downloads.downloads.length > 1,
            page: false,
            url: legacyUrl,
            cookies: task.create_downloads.downloads[0].httpCookies,
            referrer: task.create_downloads.downloads[0].httpReferer,
            post: "",
            useragent: task.create_downloads.downloads[0].userAgent
        };

        if (!legacyTask.list) {
            legacyTask.origUrl = task.create_downloads.downloads[0].originalUrl;
            legacyTask.post = task.create_downloads.downloads[0].httpPostData || "";
        }

        this.requestsManager.performRequest(
            legacyTask,
            this.processLegacyResponse.bind(this, callback));
    }
    else
    {
        //alert("unknown task: \n" + JSON.stringify(task));
        callback({ error: "not_implemented" });
    }
}

FdmNativeHostManager.prototype.processLegacyResponse = function(
    callback, resp)
{
    if (!callback)
        return;

    // it's always a response to create_downloads task

    callback({
        id: resp.id.toString(),
        error: "",
        result: resp.result ? "" : "0"
    });
}
function FdmBhDownloadLinks(nhManager, links, pageUrl, youtubeChannelVideosDownload)
{
    
    if (youtubeChannelVideosDownload === undefined) {
        youtubeChannelVideosDownload = 0;
      }    
    
// console.log('FdmBhDownloadLinks youtubeChannelVideosDownload: ' + youtubeChannelVideosDownload);
    var cm = new CookieManager;
    cm.getCookiesForUrls(
        links,
        function (cookies)
        {
            var task = new FdmBhCreateDownloadsTask;
            for (var i = 0; i < links.length; ++i)
            {
                var downloadInfo = new DownloadInfo(links[i], "", pageUrl);
                downloadInfo.userAgent = navigator.userAgent;
                downloadInfo.httpCookies = cookies[i];
                
                //Passing youtubeChannelVideosDownload flag to FDM
                downloadInfo.youtubeChannelVideosDownload = youtubeChannelVideosDownload;               
                
                task.addDownload(downloadInfo);
            }
            nhManager.postMessage(task);
// console.log('task posted');
        });
}
function ContextMenuManager()
{
    this.handlerRegistered = false;
    this.m_dlAllExists = false;
    this.m_dlthisExists = false;
    this.m_dlselectedExists = false;
    this.m_dlpageExists = false;
    this.m_dlvideoExists = false;
    this.m_dlchannelVideosExists = false;
}

ContextMenuManager.prototype.onUserDownloadLinks = function(
    links, pageUrl)
{
    
}

ContextMenuManager.prototype.onUserDownloadPage = function(
    pageUrl)
{
    
}

ContextMenuManager.prototype.onUserDownloadVideo = function(
    pageUrl)
{
    
}

ContextMenuManager.prototype.createMenu = function (
    dlthis, dlall, dlselected, dlpage, dlvideo, dlchannelvideos, dlplaylistvideos)
{
    if (dlthis)
        this.createDlThisMenu();
    else
        this.removeDlThisMenu();

    if (dlall)
        this.createDlAllMenu();
    else
        this.removeDlAllMenu();

    if (dlselected)
        this.createDlSelectedMenu();
    else
        this.removeDlSelectedMenu();

    if (dlpage)
        this.createDlPageMenu();
    else
        this.removeDlPageMenu();

    if (dlvideo)
        this.createDlVideoMenu();
    else
        this.removeDlVideoMenu();
    
    if(dlchannelvideos)
        this.createDlChannelVideosMenu();
    else 
        this.removeDlChannelVideosMenu();

    if(dlplaylistvideos)
        this.createDlPlaylistVideosMenu();
    else
        this.removeDlPlaylistVideosMenu();

    if (!this.handlerRegistered)
    {
        browser.contextMenus.onClicked.addListener(this.onClicked.bind(this));
        this.handlerRegistered = true;
    }
}

ContextMenuManager.prototype.createDlThisMenu = function()
{
    if (this.m_dlthisExists)
        return;

    this.m_dlthisExists = true;

    browser.contextMenus.create(
    {
        "id": "dlthis",
        "title": browser.i18n.getMessage("menuThis"),
        "contexts": ["image", "link"],
    });
}

ContextMenuManager.prototype.onClickedDlThis = function(info, tab)
{
    if (info.linkUrl)
        this.onUserDownloadLinks([info.linkUrl], info.pageUrl);
    else if (info.mediaType == "image")
        this.onUserDownloadLinks([info.srcUrl], info.pageUrl);
}

ContextMenuManager.prototype.createDlAllMenu = function()
{
    if (this.m_dlAllExists)
        return;

    this.m_dlAllExists = true;

    browser.contextMenus.create(
    {
        "id": "dlall",
        "title": browser.i18n.getMessage("menuAll"),
        "contexts": ["page"]
    });
}

ContextMenuManager.prototype.createDlSelectedMenu = function()
{
    if (this.m_dlselectedExists)
        return;

    this.m_dlselectedExists = true;

    browser.contextMenus.create(
    {
        "id": "dlselected",
        "title": browser.i18n.getMessage("menuSelected"),
        "contexts": ["selection"]
    });
}

ContextMenuManager.prototype.createDlPageMenu = function()
{
    if (this.m_dlpageExists)
        return;

    this.m_dlpageExists = true;

    browser.contextMenus.create(
    {
        "id": "dlpage",
        "title": browser.i18n.getMessage("menuSite"),
        "contexts": ["page"]
    });
}

ContextMenuManager.prototype.createDlVideoMenu = function()
{
    if (this.m_dlvideoExists)
        return;

    this.m_dlvideoExists = true;

    browser.contextMenus.create(
    {
        "id": "dlvideo",
        "title": browser.i18n.getMessage("menuVideoShort"),
        "contexts": ["page"]
    });
}

ContextMenuManager.prototype.createDlChannelVideosMenu = function()
{
    if (this.m_dlchannelVideosExists)
        return;
    
    this.m_dlchannelVideosExists = true;  
    
    browser.contextMenus.create(
    {
        "id": "dlchanelvideos",
        "title": browser.i18n.getMessage("menuChannelVideosShort"),
        "contexts": ["page"]
    });    
}

ContextMenuManager.prototype.createDlPlaylistVideosMenu = function()
{
    if (this.m_dlplaylistVideosExists)
        return;

    this.m_dlplaylistVideosExists = true;

    browser.contextMenus.create(
    {
        "id": "dlplaylistvideos",
        "title": browser.i18n.getMessage("menuPlaylistVideosShort"),
        "contexts": ["page"]
    });
}

ContextMenuManager.prototype.onClicked = function(
    info, tab)
{
    switch(info.menuItemId)
    {
        case "dlall": this.onClickedDlAll(info, tab); break;
        case "dlselected": this.onClickedDlSelected(info, tab); break;
        case "dlpage": this.onClickedDlPage(info, tab); break;
        case "dlvideo": this.onClickedDlVideo(info, tab); break;
        case "dlchanelvideos": this.onClickedDlChannelVideos(info, tab); break;
        case "dlplaylistvideos": this.onClickedDlPlaylistVideos(info, tab); break;
        case "dlthis": this.onClickedDlThis(info, tab); break;
    }
}

ContextMenuManager.prototype.onClickedDlAll = function(
    info, tab)
{
    browser.scripting.executeScript(
        {
            "target": {"tabId": tab.id, "frameIds": [info.frameId]},
            "func": () => {return JSON.stringify([].map.call(document.getElementsByTagName('a'), function(n) {return n.href;}).concat([].map.call(document.getElementsByTagName('img'), function(n) {return n.src;})));}
        },
        function(h) {
            let links = [];
            for (let i = 0; i < h.length; i++) {
                try {
                    let l = JSON.parse(h[i].result);
                    if (l && l.length > 0) {
                        links = links.concat(l.filter(function (el) {
                            return el != '';
                        }));
                    }
                } catch (e) {
                }
            }
            this.onUserDownloadLinks(links, tab.url);
        }.bind(this)
    );
}

ContextMenuManager.prototype.onClickedDlSelected = function(
    info, tab)
{
    browser.scripting.executeScript(
        {
            "target": {"tabId": tab.id, "frameIds": [info.frameId] },
            "func": () => {
                let s = window.getSelection();
                let dv = document.createElement('div');
                for (let i = 0; i < s.rangeCount; ++i) {
                    dv.appendChild(s.getRangeAt(i).cloneContents());
                }
                return JSON.stringify([].map.call(dv.getElementsByTagName('a'), function(n) {return n.href;}));
            }
        },
        function (h) {
            let links = [];
            for (let i = 0; i < h.length; i++)
            {
                try {
                    let l = JSON.parse(h[i].result);
                    if (l && l.length > 0) {
                        links = links.concat(l.filter(function (el) {
                            return el != '';
                        }));
                    }
                }
                catch (e){}
            }

            this.onUserDownloadLinks(links, tab.url);
        }.bind(this)
    );

    this.createDlThisMenu();
}

ContextMenuManager.prototype.onClickedDlPage = function(
    info, tab)
{
    this.onUserDownloadPage(tab.url);
}

ContextMenuManager.prototype.onClickedDlVideo = function(
    info, tab)
{
    this.onUserDownloadVideo(tab.url);
}

ContextMenuManager.prototype.onClickedDlChannelVideos = function(
    info, tab)
{
    //this.onUserDownloadChannelVideos(tab.url);
    //console.log('download channel clicked. this.youtubeChannelVideosUrl: ' + this.youtubeChannelVideosUrl);
    FdmBhDownloadLinks(this.nhManager, [this.youtubeChannelVideosUrl], this.youtubeChannelVideosUrl, 1);
}

ContextMenuManager.prototype.onClickedDlPlaylistVideos = function(
    info, tab)
{
    //this.onUserDownloadChannelVideos(tab.url);
    // console.log('download channel clicked. this.onClickedDlPlaylistVideos: ' + this.youtubePlaylistUrl);
    FdmBhDownloadLinks(this.nhManager, [this.youtubePlaylistUrl], this.youtubePlaylistUrl, 2);
}

ContextMenuManager.prototype.removeDlThisMenu = function()
{
    if (!this.m_dlthisExists)
        return;

    this.m_dlthisExists = false;

    browser.contextMenus.remove("dlthis");
}

ContextMenuManager.prototype.removeDlAllMenu = function()
{
    if (!this.m_dlAllExists)
        return;

    this.m_dlAllExists = false;

    browser.contextMenus.remove("dlall");
}

ContextMenuManager.prototype.removeDlSelectedMenu = function()
{
    if (!this.m_dlselectedExists)
        return;

    this.m_dlselectedExists = false;

    browser.contextMenus.remove("dlselected");
}

ContextMenuManager.prototype.removeDlPageMenu = function()
{
    if (!this.m_dlpageExists)
        return;

    this.m_dlpageExists = false;

    browser.contextMenus.remove("dlpage");
}

ContextMenuManager.prototype.removeDlVideoMenu = function()
{
    if (!this.m_dlvideoExists)
        return;

    this.m_dlvideoExists = false;

    browser.contextMenus.remove("dlvideo");
}

ContextMenuManager.prototype.removeDlChannelVideosMenu = function()
{
    if (!this.m_dlchannelVideosExists)
        return;

    this.m_dlchannelVideosExists = false;

    browser.contextMenus.remove("dlchanelvideos");
}

ContextMenuManager.prototype.removeDlPlaylistVideosMenu = function()
{
    if (!this.m_dlplaylistVideosExists)
        return;

    this.m_dlplaylistVideosExists = false;

    browser.contextMenus.remove("dlplaylistvideos");
}
function FdmContextMenuManager(tabsManager)
{
    this.m_dlthis = false;
    this.m_dlall = false;
    this.m_dlselected = false;
    this.m_dlpage = false;
    this.m_dlvideo = false;
    this.m_dlYtChannel = false;
    this.m_dlYtPlaylist = false;
    this.m_browserHasSelection = false;
    this.m_browserSelectionLinksCount = 0;
    this.tabsManager = tabsManager;

    this.youtubeDomain = false;
    this.youtubeChannelVideosUrl = '';
    this.youtubePlaylistUrl = '';

    this.DownloadAsLinks = new Set();
    this.DownloadAsLinks.add("www.youtube.com");
}

FdmContextMenuManager.prototype = new ContextMenuManager();

FdmContextMenuManager.prototype.setNativeHostManager = function (mgr)
{
    this.nhManager = mgr;
    browser.runtime.onMessage.addListener(this.onMessage.bind(this));
};

FdmContextMenuManager.prototype.createMenu = function (
    dlthis, dlall, dlselected, dlpage, dlvideo, dlYtChannel, dlYtPlaylist)
{
    this.m_dlthis = dlthis;
    this.m_dlall = dlall;
    this.m_dlselected = dlselected;
    this.m_dlpage = dlpage;
    this.m_dlvideo = dlvideo;
    this.m_dlYtChannel = dlYtChannel;
    this.m_dlYtPlaylist = dlYtPlaylist;
    this.createMenuImpl();
};

FdmContextMenuManager.prototype.createMenuImpl = function()
{
    if (this.youtubeDomain) {
        ContextMenuManager.prototype.createMenu.call(
            this, false, false, false, false, false, false, false);
        return true;
    }
    
    ContextMenuManager.prototype.createMenu.call(
        this,
        this.shouldShowDlThis(),
        this.m_dlall, 
        this.shouldShowDlSelected(),
        this.m_dlpage, 
        this.shouldShowDlVideo(),
        this.shouldShowDlChannel(),
        this.shouldShowDlPlaylist());
};

FdmContextMenuManager.prototype.shouldShowDlThis = function()
{
    return this.m_dlthis && !this.shouldShowDlSelected();
};

FdmContextMenuManager.prototype.shouldShowDlSelected = function()
{
    return this.m_dlselected
            && this.m_browserHasSelection
            && this.m_browserSelectionLinksCount;
};

FdmContextMenuManager.prototype.shouldShowDlVideo = function ()
{
    return this.m_dlvideo &&
        this.tabsManager.activeTabHasVideo();
};

FdmContextMenuManager.prototype.shouldShowDlChannel = function ()
{
    return this.m_dlvideo && this.m_dlYtChannel &&
        this.youtubeChannelVideosUrl !== '';
};

FdmContextMenuManager.prototype.shouldShowDlPlaylist = function ()
{
    return this.m_dlvideo && this.m_dlYtPlaylist &&
        this.youtubePlaylistUrl !== '';
};

FdmContextMenuManager.prototype.onUserDownloadLinks = function (
    links, pageUrl, youtubeVideosFlag)
{
    FdmBhDownloadLinks(this.nhManager, links, pageUrl, youtubeVideosFlag);
};

FdmContextMenuManager.prototype.onUserDownloadVideo = function (
    pageUrl)
{
    if (this.nhManager.legacyPort || this.shouldDownloadAsLinks(pageUrl))
    {
        var youtubeVideosFlag = 0;
        if (this.m_dlYtPlaylist) {
            youtubeVideosFlag = 4;
        }
        this.onUserDownloadLinks([pageUrl], pageUrl, youtubeVideosFlag);
        return;
    }           
    var task = new FdmBhVideoSnifferTask;
    var req = new FdmBhSniffDllCreateVideoDownloadFromUrlRequest(
        pageUrl, "", "", "", "", "");
    task.setRequest(req);
    this.nhManager.postMessage(task);
};

FdmContextMenuManager.prototype.shouldDownloadAsLinks = function(url)
{
    if (!url)
        return false;
    var hostname = (new URL(url)).hostname;
    return this.DownloadAsLinks.has(hostname);
};

FdmContextMenuManager.prototype.onMessage = function(request, sender)
{
    if (sender && sender.tab) {
        if (request.type === 'fdm_reset_context_menu' && sender.tab.active) {
            return;
        }
        if (!sender.tab.active && request.type !== 'fdm_reset_context_menu') {
            return;
        }
        if (sender.frameId > 0 && sender.tab.url.indexOf('youtube.com') >= 0) {
            return;
        }
    }

    if (request.type === 'fdm_reset_context_menu' || request.type === 'fdm_reset_context_menu_beforeunload') {
        this.youtubeDomain = false;
        this.youtubeChannelVideosUrl = '';
        this.youtubePlaylistUrl = '';
        this.m_browserSelectionLinksCount = 0;
        this.m_browserHasSelection = 0;
        this.createMenuImpl();
    }

    if (request.type === "fdm_selection_change")
    {
        this.youtubeDomain = false;
        this.youtubeChannelVideosUrl = '';
        this.youtubePlaylistUrl = '';
        try {
            if (request.data) {
                this.youtubeDomain = request.data.youtubeDomain;
            }
        } catch (e) {}
        try {
            if (request.data) {
                this.youtubeChannelVideosUrl = request.data.youtubeChannelVideosUrl;
            }
        } catch (e) {}
        try {
            if (request.data) {
                this.youtubePlaylistUrl = request.data.youtubePlaylistUrl;
            }
        } catch (e) {}

        this.m_browserSelectionLinksCount = request.selectionLinksCount;
        this.m_browserHasSelection = request.hasSelection;
        this.createMenuImpl();
    }

    if (request.type === "fdm_right_mouse_button_clicked")
    {
        this.youtubeDomain = false;
        this.youtubeChannelVideosUrl = '';
        this.youtubePlaylistUrl = '';
        try {
            if (request.data) {
                this.youtubeDomain = request.data.youtubeDomain;
            }
        } catch (e) {}
        try {
            if (request.data) {
                this.youtubeChannelVideosUrl = request.data.youtubeChannelVideosUrl;
            }
        } catch (e) {}
        try {
            if (request.data) {
                this.youtubePlaylistUrl = request.data.youtubePlaylistUrl;
            }
        } catch (e) {}

        this.createMenuImpl();
        setTimeout(function(){
            this.createMenuImpl()
        }.bind(this), 200);
    }

    if (request.type === "fdm_left_mouse_button_clicked")
    {
        this.createMenuImpl();
        setTimeout(function(){
            this.createMenuImpl()
        }.bind(this), 200);
    }
};
function DownloadsInterceptManager()
{
    this.enable = false;
    this.pauseCatchingForAllSites = false;
    this.skipSmaller = 0;
    this.skipExts = "";
    this.catchExts = "";
    this.skipHosts = [];
    this.returningDownloads = [];
    /* @requestDetailsByRequestId - simple map of requestId -> request details (including postData) for interception in Firefox */
    this.requestDetailsByRequestId = new Map;
    /* @requestDetailsByRequestUrl - saves request details (including postData) by url for interception in Chrome, because of requestId cannot be used */
    this.requestDetailsByRequestUrl = [];
    this.requestsHeaders = new Map;
    // this.redirectedUrls = new Map;
    this.supportsDeterminingFilename =
        browser.downloads &&
        browser.downloads.onDeterminingFilename;

    this.lastDownload = false;

    this.DONT_SHOW_NOTIFICATION_AGAIN_LOCALSTORAGE_KEY = "dontShowNotificationAgain";
}

DownloadsInterceptManager.prototype.initialize = function()
{
    if (this.supportsDeterminingFilename)
    {
        browser.downloads.onDeterminingFilename.addListener(
            this.onDeterminingFilename.bind(this));
    }
    browser.webRequest.onBeforeSendHeaders.addListener(
        this.onBeforeSendHeaders.bind(this),
        { urls: ["<all_urls>"] },
        ["requestHeaders"]);
    // for special processing for redirects & POST requests
    browser.webRequest.onBeforeRequest.addListener(
        this.onBeforeRequest.bind(this),
        { urls: ["<all_urls>"] },
        ["requestBody"]);
    browser.webRequest.onSendHeaders.addListener(
        this.onSendHeaders.bind(this),
        { urls: ["<all_urls>"] },
        ["requestHeaders"]);
    browser.webRequest.onHeadersReceived.addListener(
        this.onHeadersReceived.bind(this),
        { urls: ["<all_urls>"] },
        ["responseHeaders"]);
};

DownloadsInterceptManager.prototype.returningDownloadIndexByOriginalUrl = function(
    url)
{
    for (var i = 0; i < this.returningDownloads.length; ++i)
    {
        if (this.returningDownloads[i].originalUrl == url)
            return i;
    }
    return -1;
};

DownloadsInterceptManager.prototype.removeRequestDetailsByOriginalUrl = function(
    url, time)
{
    var index = this.requestDetailsByRequestUrl.findIndex(item => (item.time === time && item.url === url));
    if (index !== -1) {
        this.requestDetailsByRequestUrl.splice(index, 1);
    }
};

DownloadsInterceptManager.prototype.requestDetailsIndexByOriginalUrl = function(
    url)
{
    var currentIndex = -1;
    for (var key in this.requestDetailsByRequestUrl) {
        var item = this.requestDetailsByRequestUrl[key];
        if (item.url === url && (currentIndex === -1 || item.time > this.requestDetailsByRequestUrl[currentIndex].time)) {
            currentIndex = key;
        }
    }
    return currentIndex;
};

DownloadsInterceptManager.prototype.inSkipList = function(
    url, isOriginUrl, filename)
{
    if (this.skipIfKeyPressed && this.skipKeyPressed)
        return true;

    if (!isOriginUrl)
    {
        if (this.catchExts)
        {
            var str = filename ? filename : url;
            var rgx = filename ? /(\.([\w\d]+))$/ : /(?:[^\/]+)(\.(\w+))(?:\?.+)?(?:#.+)?$/;
            var match = rgx.exec(str);
            if (match && match.length === 3)
            {
                if (this.catchExts.indexOf(match[1].toLowerCase()) == -1 && // .ext
                    this.catchExts.indexOf(match[2].toLowerCase()) == -1)   //  ext
                {
                    return true;
                }
            }
        }
        else if (this.skipExts)
        {
            var str = filename ? filename : url;
            var rgx = filename ? /(\.([\w\d]+))$/ : /(?:[^\/]+)(\.(\w+))(?:\?.+)?(?:#.+)?$/;
            var match = rgx.exec(str);
            if (match && match.length === 3)
            {
                if (this.skipExts.indexOf(match[1].toLowerCase()) != -1 || // .ext
                    this.skipExts.indexOf(match[2].toLowerCase()) != -1)   //  ext
                {
                    return true;
                }
            }
        }
    }

    if (url)
    {
        // workaround for other possible hosts like MEGA.nz
        // Added blob to exclude other protocols as well
        if (url.toLowerCase().indexOf("filesystem:") == 0
            || url.toLowerCase().indexOf("blob:") == 0
            || url.toLowerCase().indexOf("data:") == 0)
        {
            return true;
        }

        if (this.skipServersEnabled && fdmExtUtils.urlInSkipServers(this.skipHosts, url)) {
            return true;
        }
    }

    return false;
};

DownloadsInterceptManager.prototype.onDeterminingFilename = function(
    downloadItem, suggest)
{
	var details;
    var requestDetailsIndex = this.requestDetailsIndexByOriginalUrl(
        downloadItem.finalUrl);
    if (requestDetailsIndex !== -1)
    {
		details = this.requestDetailsByRequestUrl[requestDetailsIndex];
        this.requestDetailsByRequestUrl.splice(requestDetailsIndex, 1);
    }
    
    if (!this.enable || this.pauseCatchingForAllSites || this.inSkipList(downloadItem.url, false))
        return;

    /* 
        According to documentation, downloadItem.totalBytes should be -1 when it is unknown: 
        https://developer.chrome.com/extensions/downloads#type-DownloadItem 
        However, here's an example where it is 0: http://www.sample-videos.com/ -- any file
    */

    if (downloadItem.totalBytes != 0 && downloadItem.totalBytes != -1 && downloadItem.totalBytes < this.skipSmaller)
        return;

    if (downloadItem.url.indexOf("google.com") != -1 && (
            downloadItem.mime.indexOf("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") != -1
            || downloadItem.mime.indexOf("application/vnd.ms-") != -1)) {
        return;
    }

    if (this.inSkipList(downloadItem.url, false, downloadItem.filename)) {
        suggest(downloadItem);
        return;
    }

    if (this.inSkipList(downloadItem.referrer, true, downloadItem.filename)) {
        suggest(downloadItem);
        return;
    }

    if (details && details.documentUrl && this.inSkipList(details.documentUrl, true, downloadItem.filename)) {
        suggest(downloadItem);
        return;
    }

    var returningDownloadIndex = this.returningDownloadIndexByOriginalUrl(
        downloadItem.url);
    if (returningDownloadIndex != -1)
    {
        if (!--this.returningDownloads[returningDownloadIndex].refCount)
            this.returningDownloads.splice(returningDownloadIndex, 1);
        suggest(downloadItem);
        return;
    }

    if (this.lastDownload && this.lastDownload.url === downloadItem.url
        && this.lastDownload.timestamp + 5 * 60 * 1000 >= + new Date) {

        browser.storage.sync.get([this.DONT_SHOW_NOTIFICATION_AGAIN_LOCALSTORAGE_KEY], function(values) {

            if (!values[this.DONT_SHOW_NOTIFICATION_AGAIN_LOCALSTORAGE_KEY]) {

                var opt = {
                    type: "basic",
                    title: "FDM extension",
                    message: "Problems downloading from this website?",
                    iconUrl: "/assets/icons/fdm48.png",
                    buttons: [{title: "Yes, don’t catch downloads from this website."}, {title: "It's OK, don't ask again."}]
                };

                browser.notifications.create(opt, function (id) {
                    var notificationId = id;

                    var onButtonClicked = function(id, btnNum){
                        if (notificationId === id) {
                            browser.notifications.onButtonClicked.removeListener(onButtonClicked);
                            browser.notifications.onClosed.removeListener(onClosed);

                            if (btnNum === 0) {
                                this.settingsPageHlpr.changeSkipList(downloadItem.url, true);
                                this.settingsPageHlpr.changeSkipList(downloadItem.referrer, true);
                            }

                            if (btnNum === 1) {
                                var newValues = {};
                                newValues[this.DONT_SHOW_NOTIFICATION_AGAIN_LOCALSTORAGE_KEY] = true;
                                browser.storage.sync.set(newValues);
                            }
                        }
                    }.bind(this);

                    var onClosed = function(){
                        if (notificationId === id) {
                            browser.notifications.onButtonClicked.removeListener(onButtonClicked);
                            browser.notifications.onClosed.removeListener(onClosed);
                        }
                    }.bind(this);

                    browser.notifications.onButtonClicked.addListener(onButtonClicked);
                    browser.notifications.onClosed.addListener(onClosed);

                }.bind(this));
            }

        }.bind(this));
    }

    this.lastDownload = {
        url: downloadItem.url,
        timestamp: + new Date
    };

    browser.downloads.cancel(downloadItem.id, function() {
        browser.downloads.erase({ id: downloadItem.id })
    });

    // this.addRules(downloadItem.url);

    this.onDownloadIntercepted(new DownloadInfo(
        downloadItem.url,
        downloadItem.finalUrl,//this.pullRedirectUrl(downloadItem.url),
        downloadItem.referrer, 
		details && details.postData ? details.postData : "",
		details ? details.documentUrl : "")
        // null,
        // function NativeHostResponse(resp){
        //     if (this.needReturnDownload(resp)) {
        //         suggest(downloadItem);
        //     } else {
        //         browser.downloads.cancel(downloadItem.id, function() {
        //             browser.downloads.erase({ id: downloadItem.id })
        //         });
        //     }
        // }.bind(this)
    );

    return true;
};

// DownloadsInterceptManager.prototype.needReturnDownload = function(resp) {
//     var cancelled = resp.result === "0";
//     return (resp.error || (cancelled && this.allowBrowserDownload));
// };

DownloadsInterceptManager.prototype.returnDownload = function(
    downloadInfo, details)
{
    downloadInfo.refCount = downloadInfo.httpPostData ? 2 : 1;
    this.returningDownloads.push(downloadInfo);

    // this.clearRules(downloadInfo.originalUrl);

    var info = {};
    info.url = downloadInfo.originalUrl;
    // chrome does not accept referer here
    // see workaround in this.onBeforeSendHeaders.
    //info.headers = [{ name: "Referer", value: downloadInfo.httpReferer }];
    if (downloadInfo.httpPostData && downloadInfo.httpPostData != "")
    {
        info.method = "POST";
        info.body = downloadInfo.httpPostData;
    }

    info.saveAs = true;

    if (details && details.responseHeadersMap && typeof details.responseHeadersMap.has === 'function'
        && details.responseHeadersMap.has("content-disposition")) {

        var disposition = details.responseHeadersMap.get("content-disposition");

        var m = disposition.match(/filename[^;=\n]*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?([^;\n]*))/i);
        if (m && m.length && m[3]) {
            info.filename = m[3];
        }
    }

    browser.downloads.download(
        info,
        function (downloadId)
        {
            if (!downloadId)
            {
                alert(browser.i18n.getMessage("addingAfterCancelFailed"));
            }
            else if (!this.supportsDeterminingFilename)
            {
                var returningDownloadIndex = this.returningDownloadIndexByOriginalUrl(info.url);
                if (returningDownloadIndex != -1)
                    this.returningDownloads.splice(returningDownloadIndex, 1);
            }
        }.bind(this, info));

    browser.windows.getCurrent(function(w){
        chrome.windows.update(w.id, {focused: true})
    });
};

DownloadsInterceptManager.prototype.onBeforeSendHeaders = function(
    details)
{
    if (!this.enable || this.pauseCatchingForAllSites || this.inSkipList(details.url, false))
        return;

    // console.log('onBeforeSendHeaders', details.url);
    // set the Referer header when bringing the download back to Chrome

    var returningDownloadIndex = this.returningDownloadIndexByOriginalUrl(
        details.url);

    if (returningDownloadIndex != -1)
    {
        // this.clearRules(details.url);
        var referer = this.returningDownloads[returningDownloadIndex].httpReferer;

        var isRefererSet = false;
        var headers = details.requestHeaders;
        var blockingResponse = {};

        for (var i = 0; i < headers.length; ++i)
        {
            if (headers[i].name.toLowerCase() == "referer")
            {
                headers[i].value = referer;
                isRefererSet = true;
                break;
            }
        }

        if (!isRefererSet) {
            headers.push({
                             name: "Referer",
                             value: referer
                         });
        }

        blockingResponse.requestHeaders = headers;
        return blockingResponse;
    }

    if (this.requestDetailsByRequestId.has(details.requestId))
    {
        // this.addRules(details.url);

        let cookies = "";

        for (let h of details.requestHeaders)
        {
            if (h.name.toLowerCase() === "cookie")
            {
                if (cookies)
                    cookies += "; ";
                cookies += h.value;
            }
        }

        let requestDetails = this.requestDetailsByRequestId.get(details.requestId);
        requestDetails.cookies = cookies;
        this.requestDetailsByRequestId.set(details.requestId, requestDetails);
    }
};

DownloadsInterceptManager.prototype.onBeforeRequest = function(details)
{
    if (!this.enable || this.pauseCatchingForAllSites || this.inSkipList(details.url, false))
        return;

    // console.log('onBeforeRequest', details.url);

	var currentTime = + new Date;

	var requestDetails = {
		"url" : details.url,
		"time": currentTime
	};

    requestDetails.documentUrl = details.documentUrl;
    if (!requestDetails.documentUrl && this.tabsMgr && details.tabId !== -1 && this.tabsMgr.tabExists(details.tabId))
        requestDetails.documentUrl = this.tabsMgr.tabs[details.tabId].url;

    if (details.method == "POST")
    {
        requestDetails.postData = "&";
        if (undefined != details.requestBody && undefined != details.requestBody.formData)
        {
            for (var field in details.requestBody.formData)
            {
                for (var i = 0; i < details.requestBody.formData[field].length; ++i)
                {
                    requestDetails.postData += field + "=" +
                            encodeURIComponent(details.requestBody.formData[field][i]) +
                            "&";
                }
            }
        }
	}

	this.requestDetailsByRequestId.set(details.requestId, requestDetails);
    // setTimeout(this.requestDetailsByRequestId.delete.bind(this.requestDetailsByRequestId, details.requestId), 120000);
    startTimerAlarm('NRMRequestDetailsByRequestId', 120000, () => this.requestDetailsByRequestId.delete.bind(this.requestDetailsByRequestId, details.requestId));

    this.requestDetailsByRequestUrl.push(requestDetails);
    // setTimeout(this.removeRequestDetailsByOriginalUrl.bind(this, details.url, currentTime), 120000);
    startTimerAlarm('NRMRemoveRequestDetailsByOriginalUrl', 120000, () => this.removeRequestDetailsByOriginalUrl.bind(this, details.url, currentTime));
};

DownloadsInterceptManager.prototype.onSendHeaders = function(
    details)
{
    if (!this.enable || this.pauseCatchingForAllSites || this.inSkipList(details.url, false))
        return;

    // console.log('onSendHeaders', details.url);

    if (details.method == "POST" ||
        !this.supportsDeterminingFilename)
    {
        this.requestsHeaders.set(details.requestId, details.requestHeaders);
        // setTimeout(this.requestsHeaders.delete.bind(this.requestsHeaders, details.requestId), 120000);
        startTimerAlarm('NRMRequestDetailsByRequestId', 120000, () => this.requestsHeaders.delete.bind(this.requestsHeaders, details.requestId));
    }
    // this.clearRules(details.url);
};

DownloadsInterceptManager.prototype.onHeadersReceived = function(
    details)
{
    // console.log('onHeadersReceived', details.url);
    // if (details.statusLine.indexOf("301") != -1 || details.statusLine.indexOf("302") != -1)
    // since v43
    // if (details.statusCode == 301 || details.statusCode == 302)
    //     this.onRedirectHeadersReceived(details);
    
    if (!this.supportsDeterminingFilename)
        return this.interceptIfRequiredByHeaders(details);

    // setTimeout(this.clearRedirectHeadersReceived.bind(this, details), 2000);
};

// DownloadsInterceptManager.prototype.clearRedirectHeadersReceived = function(
//     details)
// {
//     this.redirectedUrls.forEach(function(value, key){
//         if (details.url === value) {
//             this.redirectedUrls.delete(key);
//         }
//     }.bind(this))
// };

// DownloadsInterceptManager.prototype.onRedirectHeadersReceived = function(
//     details)
// {
//     var url = "";
//     for (var i = 0; i < details.responseHeaders.length; ++i)
//     {
//         if (details.responseHeaders[i].name.toLowerCase() == "location")
//         {
//             url = details.responseHeaders[i].value;
//             var re = /http(s?):\/\//;
//             // if Path is relative, then add domain.
//             if (!re.test(url))
//                 url = fdmExtUtils.normalizeRedirectURL(url, details.url);
//             break;
//         }
//     }
//     if (url != "") {
//         this.redirectedUrls.set(details.url, url);
//         setTimeout(function () {
//             if (this.redirectedUrls.has(details.url)){
//                 this.redirectedUrls.delete(details.url);
//             }
//         }.bind(this), 120000);
//     }
// };

// DownloadsInterceptManager.prototype.pullRedirectUrl = function(url)
// {
//     var result;
//     if (this.redirectedUrls.has(url))
//     {
//         result = this.redirectedUrls.get(url);
//         this.redirectedUrls.delete(url);
//     }
//     return result || "";
// };

DownloadsInterceptManager.prototype.responseHeadersToMap = function(responseHeadersArr)
{
    if (!responseHeadersArr || !responseHeadersArr.length)
        return new Map();

    var headers_map = new Map();

    for (var i = 0; i < responseHeadersArr.length; i++)
    {
        headers_map.set(responseHeadersArr[i].name.toLowerCase(), responseHeadersArr[i].value);
    }

    return headers_map;
};

DownloadsInterceptManager.prototype.interceptIfRequiredByHeaders = function(
    details)
{
    // console.log('interceptIfRequiredByHeaders', details.url);
    var result;

    if (details.tabId < 0)
        return;

    var in_skip_list = false;
    if (this.inSkipList(details.url, false)) {
        in_skip_list = true;
    } else if (details.originUrl && this.inSkipList(details.originUrl, true)) {
        in_skip_list = true;
    }

    if (this.enable && !this.pauseCatchingForAllSites &&
        !in_skip_list)
    {
        var file = false;
        var noContentLengthLimits = false;

        if (details.type != "xmlhttprequest" && 
            (details.method == "POST" || details.type == 'main_frame' || details.type == 'sub_frame'))
        {
            var responseHeadersMap = this.responseHeadersToMap(details.responseHeaders);
            details.responseHeadersMap = responseHeadersMap;

            if (responseHeadersMap.has("content-disposition"))
            {
                file = true;
            }

            // prevent AJAX from breaking
            if (responseHeadersMap.has("content-type"))
            {
                var ct = responseHeadersMap.get("content-type").toLowerCase();
                if (ct.indexOf("json") != -1 ||
                    ct.indexOf("image/") != -1 ||
                   (ct.indexOf("text") != -1 && ct.indexOf("text/x-sql") == -1) ||
                    ct.indexOf("javascript") != -1 ||
                    ct.indexOf("application/x-protobuf") != -1 ||
                    ct.indexOf("application/binary") != -1 ||
                    ct.indexOf("application/pdf") != -1
                    || (details.url.indexOf("google.com") != -1 && (
                        ct.indexOf("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") != -1
                        || ct.indexOf("application/vnd.ms-") != -1)))
                {
                    file = false;
                }
                else if (ct.indexOf("application/x-bittorrent") != -1) 
                {
                    file = true;
                    noContentLengthLimits = true;
                }
                else if (details.method != "POST" && ct.indexOf("application") != -1)
                {
                    file = true;
                }
            }

            if (file && !this.supportsDeterminingFilename)
            {
                if (responseHeadersMap.has("content-length"))
                {
                    if (!noContentLengthLimits) {
                        var l = parseInt(responseHeadersMap.get("content-length"));
                        if (l < 1024 * 1024)
                            file = false; // we prefer to not intercept something we should rather than intercept something we shouldn't
                        else if (l < this.skipSmaller)
                            file = false;
                    }
                }
                else
                {
                    // we prefer to not intercept something we should rather than intercept something we shouldn't
                    file = false;
                }
            }
        }

        if (file)
        {
            var returningDownloadIndex = this.returningDownloadIndexByOriginalUrl(
                details.url);
            if (returningDownloadIndex != -1)
            {
                if (!--this.returningDownloads[returningDownloadIndex].refCount)
                    this.returningDownloads.splice(returningDownloadIndex, 1);
            }
            else
            {
                var referrer = "";
                if (this.requestsHeaders.has(details.requestId))
                {
                    var r = this.requestsHeaders.get(details.requestId);
                    for (var j = 0; j < r.length; ++j)
                    {
                        var rheader = r[j];
                        if (rheader.name.toLowerCase() == "referrer" ||
                            rheader.name.toLowerCase() == "referer")
                            referrer = rheader.value;
                    }
                }

				var requestDetails = this.requestDetailsByRequestId.get(details.requestId);

                var downloadInfo = new DownloadInfo(
                    details.url,
                    "",
                    referrer,
                    requestDetails ? requestDetails.postData : "",
                    requestDetails ? requestDetails.documentUrl : "");

                downloadInfo.httpCookies = requestDetails.cookies;

                this.onDownloadIntercepted(downloadInfo, details
                    // function NativeHostResponse(resp){
                    //     if (this.needReturnDownload(resp)) {
                    //         this.returnDownload(downloadInfo, details);
                    //     }
                    // }.bind(this)
                );

                if (details.method === "POST")
                {
                    if (referrer)
                    {
                        // When referrer is empty, it just "redirects" to some empty page with chrome://extension as the URL (someone was complaining about that?)
                        browser.tabs.update(details.tabId, { 'url': referrer });
                    }

                    // Used to be cancel: true, but it messes up the tab ("Extension disabled the request" or smth like that) http://stackoverflow.com/a/18684302
                    result = { 'redirectUrl': "javascript:" };
                }
                else
                {
                    result = { 'cancel': true };
                }
            }
        }
    }

    this.requestDetailsByRequestId.delete(details.requestId);
    this.requestsHeaders.delete(details.requestId);
    // this.clearRules(detailes.url);

    return result;
};

DownloadsInterceptManager.prototype.addRules = function(url) {
    // console.log('addRules', url);
    browser.declarativeNetRequest.getDynamicRules(previousRules => {
        browser.declarativeNetRequest.updateDynamicRules({
            addRules: [{
                "id": Math.round(Math.random()*10000),
                "priority": 1,
                "action": {"type": "block"},
                "condition": {"urlFilter": url, domainType: "thirdParty"}
            }]
        });
    });
};

DownloadsInterceptManager.prototype.clearRules = function(url) {
    // console.log('clearRules', url);
    let rulesToClear = [];
    browser.declarativeNetRequest.getDynamicRules(previousRules => {
        const previousRuleIds = previousRules.map(rule => rule.id);
        previousRules.forEach((rule) => {
            // console.log('match', rule.condition.urlFilter, rule.condition.urlFilter.indexOf(url));

            if (rule.condition.urlFilter.indexOf(url) === -1) {
                rulesToClear.push(rule.id);
            }
        });

        // console.log('rulesToClear', rulesToClear);
        browser.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: rulesToClear
        });
    });
};

function FdmDownloadsInterceptManager(settingsPageHlpr, tabsMgr)
{
    this.allowBrowserDownload = true;
    this.settingsPageHlpr = settingsPageHlpr;
    this.tabsMgr = tabsMgr;
}

FdmDownloadsInterceptManager.prototype = new DownloadsInterceptManager();

FdmDownloadsInterceptManager.prototype.setNativeHostManager = function(mgr)
{
    this.nhManager = mgr;
};

FdmDownloadsInterceptManager.prototype.onDownloadIntercepted = function(
    downloadInfo, details, callbackFn)
{
    downloadInfo.userAgent = navigator.userAgent;

    if (downloadInfo.httpCookies)
    {
        this.passDownloadToFdm(downloadInfo, details, callbackFn);
    }
    else
    {
        var cm = new CookieManager;
        cm.getCookiesForUrl(
            downloadInfo.url,
            function (cookies)
            {
                downloadInfo.httpCookies = cookies;
                this.passDownloadToFdm(downloadInfo, details, callbackFn);
            }.bind(this));
    }
}

FdmDownloadsInterceptManager.prototype.passDownloadToFdm = function(
    downloadInfo, details, callbackFn)
{
    var task = new FdmBhCreateDownloadsTask;
    task.create_downloads.catchedDownloads = "1";
    task.create_downloads.waitResponse = "1";
    task.addDownload(downloadInfo);
    this.nhManager.postMessage(
        task,
        // callbackFn
        function (resp)
        {
            var cancelled = resp.result == "0";
            if (resp.error || (cancelled && this.allowBrowserDownload))
                this.returnDownload(downloadInfo, details);
        }.bind(this)
    );
}

function NetworkRequestsMonitor()
{
    this.requestsHeaders = new Map;
    this.requestsMethods = new Map;
}

NetworkRequestsMonitor.prototype.initialize = function()
{
    browser.webRequest.onSendHeaders.addListener(
        this.onSendHeaders.bind(this),
        { urls: ["<all_urls>"] },
        ["requestHeaders"]);

    browser.webRequest.onResponseStarted.addListener(
        this.onResponseStarted.bind(this),
        { urls: ["<all_urls>"] },
        ["responseHeaders"]);

    browser.webRequest.onErrorOccurred.addListener(
        this.onErrorOccurred.bind(this),
        { urls: ["<all_urls>"] });
}

NetworkRequestsMonitor.prototype.idoneousRequest = function(details)
{
    return details.tabId != -1;
}

NetworkRequestsMonitor.prototype.onSendHeaders = function(details)
{
    if (!this.idoneousRequest(details))
        return;
    this.requestsHeaders.set(details.requestId, details.requestHeaders);
    this.requestsMethods.set(details.requestId, details.method);

    // setTimeout(this.waitingTimeoutOccurred.bind(this, details.requestId), 120000);
    startTimerAlarm('NetworkRequestsMonitor', 120000, () => this.waitingTimeoutOccurred.bind(this, details.requestId));

    try
    {
        browser.tabs.get(details.tabId, function (tab)
        {
            if (tab)
            {
                this.onNewRequest(details.requestId, details.url,
                    tab.url ? tab.url : "");
            }
        }.bind(this));
    }
    catch(err)
    {

    }
}

NetworkRequestsMonitor.prototype.onResponseStarted = function(details)
{
    if (!this.idoneousRequest(details))
        return;
    if (!this.requestsHeaders.has(details.requestId))
        return;
    this.onGotHeaders(
        details.requestId,
        details.url,
        this.requestsMethods.get(details.requestId),
        this.requestsHeaders.get(details.requestId),
        details.statusLine,
        details.responseHeaders);
    this.onRequestClosed(details.requestId);
}

NetworkRequestsMonitor.prototype.onErrorOccurred = function(details)
{
    if (!this.idoneousRequest(details))
        return;
    this.onRequestClosed(details.requestId);
}

NetworkRequestsMonitor.prototype.waitingTimeoutOccurred = function(request_id)
{
    this.onRequestClosed(request_id);
}

NetworkRequestsMonitor.prototype.onRequestClosed = function(requestId)
{
    this.requestsHeaders.delete(requestId);
    this.requestsMethods.delete(requestId);
}

NetworkRequestsMonitor.prototype.onNewRequest = function(
    requestId, url, tabUrl)
{

}

NetworkRequestsMonitor.prototype.onGotHeaders = function(
    requestId, url,
    requestMethod, requestHeaders,
    responseStatusLine, responseHeaders)
{

}
function FdmNetworkRequestsMonitor(nhManager)
{
    this.nhManager = nhManager;
}

FdmNetworkRequestsMonitor.prototype = new NetworkRequestsMonitor;

FdmNetworkRequestsMonitor.prototype.onNewRequest = function (
    requestId, url, tabUrl)
{
    var task = new FdmBhNewNetworkRequestNotification;
    task.network_request_notification.requestId = requestId;
    task.setInfo(url, tabUrl);
    this.nhManager.postMessage(task);
}

function HttpHeadersToString(hdrs)
{
    var result = "";
    for (var key in hdrs)
    {
        var hdr = hdrs[key];
        if (hdr.name && hdr.value)
        {
            result += hdr.name;
            result += ": ";
            result += hdr.value;
            result += "\r\n";
        }
    }
    return result;
}

function PathFromUrl(url)
{
    var index = url.indexOf("://");
    if (index == -1)
        return url;
    index = url.indexOf("/", index+3);
    if (index == -1)
        return "/";
    return url.substr(index, url.length - index);
}

FdmNetworkRequestsMonitor.prototype.onGotHeaders = function (
    requestId, url, 
    requestMethod, requestHeaders, 
    responseStatusLine, responseHeaders)
{
    var task = new FdmBhNetworkRequestResponseNotification;

    var rqh = requestMethod + " " + PathFromUrl(url) + " HTTP/1.1\r\n";
    rqh += HttpHeadersToString(requestHeaders) + "\r\n";

    var rsh = responseStatusLine + "\r\n" + 
        HttpHeadersToString(responseHeaders) + "\r\n";

    task.setInfo(requestId, url, rqh, rsh);

    this.nhManager.postMessage(task);
}
function FdmSettingsPageHelper(nhManager, fdmExt)
{
    this.nhManager = nhManager;
    this.fdmExt = fdmExt;
}

FdmSettingsPageHelper.prototype.initialize = function()
{
    browser.runtime.onMessage.addListener(this.onMessage.bind(this));
    this.setIcon(this.fdmExt.diManager.pauseCatchingForAllSites);
};

FdmSettingsPageHelper.prototype.onMessage = function(request, sender, sendResponse)
{
    if (request.type === "get_settings_for_page") {
        sendResponse(this.fdmExt.settings);
    }
    if (request.type === "get_build_version_for_page") {
        sendResponse(this.fdmExt.buildVersion);
    }
    if (request.type === "change_active_tab_in_skip_list") {
        this.changeActiveTabInSkipList(request.checked);
    }
    if (request.type === "on_user_options_click") {
        var task = new FdmBhJsonTask;
        task.setJson({
            type: "optionsClick"
        });
        this.nhManager.postMessage(
            task,
            sendResponse);
    }
    if (request.type === "get_pause_on_all_sites_flag") {
        sendResponse(this.fdmExt.diManager.pauseCatchingForAllSites);
    }
    if (request.type === "set_pause_on_all_sites_flag") {
        this.fdmExt.diManager.pauseCatchingForAllSites = request.pause;
        this.setIcon(request.pause);
    }
};

FdmSettingsPageHelper.prototype.setIcon = function(in_pause)
{
    if (in_pause) {
        chrome.action.setIcon({path:"/assets/icons/fdm16d.png"})
    } else {
        chrome.action.setIcon({path:"/assets/icons/fdm16.png"})
    }
};

FdmSettingsPageHelper.prototype.changeActiveTabInSkipList = function(checked)
{
    browser.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length) {
            var url = tabs[0].url;
            this.changeSkipList(url, checked);
        }
    }.bind(this));
};

FdmSettingsPageHelper.prototype.changeSkipList = function (url, checked) {
    var new_skip_servers;
    if (checked) {
        new_skip_servers = fdmExtUtils.addUrlToSkipServers(this.fdmExt.diManager.skipHosts, url);
    } else {
        new_skip_servers = fdmExtUtils.removeUrlFromSkipServers(this.fdmExt.diManager.skipHosts, url);
    }
    var new_skip_servers_str = fdmExtUtils.skipServers2string(new_skip_servers);

    var s = this.fdmExt.settings;
    s.browser.monitor.skipServers = new_skip_servers_str;
    s.browser.monitor.skipServersEnabled = "1";

    var task = new FdmBhPostSettingsTask;
    task.setSettings(s);
    this.nhManager.postMessage(
        task,
        this.onSettingsUpdated.bind(this));
};

FdmSettingsPageHelper.prototype.onSettingsUpdated = function() {
    this.fdmExt.updateSettings();
};

function TabInfo()
{
    this.hasVideo = false;
}

TabInfo.prototype.update = function(
    tab)
{
    if (tab.hasOwnProperty("url"))
        this.url = tab.url;
}

function TabsManager(nhManager)
{
    this.nhManager = nhManager;
}

TabsManager.prototype.initialize = function()
{
    browser.tabs.onCreated.addListener(
        this.onTabCreated.bind(this));
    browser.tabs.onUpdated.addListener(
        this.onTabUpdated.bind(this));
    browser.tabs.onRemoved.addListener(
        this.onTabRemoved.bind(this));
    browser.tabs.onActivated.addListener(
        this.onTabActivated.bind(this));
    setInterval(
        this.onTimer.bind(this),
        1000);
}

TabsManager.prototype.tabs = {};

TabsManager.prototype.tabExists = function(
    id)
{
    return this.tabs.hasOwnProperty(id);
}

TabsManager.prototype.onTabCreated = function (
    tab)
{
    if (!tab.hasOwnProperty("id"))
    {
        console.error("onTabCreated: tab has no id", tab.id);
        return;
    }
    this.tabs[tab.id] = new TabInfo();
    this.tabs[tab.id].update(tab);
    this.onTabUrlChanged(tab.id);
}

TabsManager.prototype.onTabUpdated = function (
    id, changeInfo, tab)
{
    if (!this.tabExists(id))
    {
        this.onTabCreated(tab);

        if (!this.tabExists(id))
        {
            console.error("onTabUpdated: unknown tab", id);
            return;
        }
    }

    if (changeInfo.url)
    {
        this.tabs[id].url = changeInfo.url;
        this.onTabUrlChanged(id);
    }
}

TabsManager.prototype.onTabRemoved = function (
    id, removeInfo)
{
    if (this.tabExists(id))
        delete this.tabs[id];
}

TabsManager.prototype.onTabActivated = function (
    activeInfo)
{
    this.activeTabId = activeInfo.tabId;
}

TabsManager.prototype.onTabUrlChanged = function (
    id)
{
    this.tabs[id].hasVideo = false;
    var url = this.tabs[id].url;
    if (!url)
        return;
    var re = new RegExp("^(http[s]?):\\/\\/(www\\.)?youtube\\.com\\/watch\\?(([^v=]+)=([^&]+)&)*v=.+");
    if (url.match(re))
        this.tabs[id].hasVideo = true;
}

TabsManager.prototype.activeTabHasVideo = function()
{
    try 
    {
        return this.tabs[this.activeTabId].hasVideo;
    }
    catch (err)
    {
        return false;
    }
}

TabsManager.prototype.onTimer = function()
{
    browser.tabs.query({ active: true, currentWindow: true }, function(tabs)
    {
        if (tabs.length) {
            this.activeTabId = tabs[0].id;
        } else {
            this.activeTabId = false;
        }
    }.bind(this));

    for (var id in this.tabs)
    {
        var info = this.tabs[id];
        if (info.hasVideo)
            continue;
        if (!info.url)
            continue;
        var task = new FdmBhVideoSnifferTask;
        var req = new FdmBhSniffDllIsVideoFlashRequest(
            info.url, "", "", "", "", "");
        task.setRequest(req);
        this.nhManager.postMessage(task, function(tabId, resp)
        {
            if (this.tabExists(tabId))
            {
                this.tabs[tabId].hasVideo = resp.videoSniffer.result &&
                    resp.videoSniffer.result != "0";
            }
        }.bind(this, id));
    }
}
function FdmSchemeHandler(nhManager)
{
    this.nhManager = nhManager;
}

FdmSchemeHandler.prototype.initialize = function()
{
    browser.runtime.onMessage.addListener(this.onMessage.bind(this));

    browser.webRequest.onBeforeRequest.addListener(
        this.onBeforeRequest.bind(this),
        { urls: ["<all_urls>"] },
        []);
};

FdmSchemeHandler.prototype.onMessage = function(request, sender, sendResponse)
{
    if (request.type == "fdm_scheme")
        this.sendUrlToFdm(request.url);
};

FdmSchemeHandler.prototype.onBeforeRequest = function (details)
{
    if (details.url.indexOf("fdmguid=6d36f5b5519148d69647a983ebd677fc") != -1)
    {
        this.sendUrlToFdm(details.url);
        return { redirectUrl: "javascript:" };
    }
};

FdmSchemeHandler.prototype.sendUrlToFdm = function(url)
{
    var dojob = function (cookies)
    {
        var task = new FdmBhCreateDownloadsTask;
        var downloadInfo = new DownloadInfo(url, "", "");
        downloadInfo.userAgent = navigator.userAgent;
        if (cookies)
            downloadInfo.httpCookies = cookies;
        task.addDownload(downloadInfo);
        this.nhManager.postMessage(task);
    }.bind(this);

    if (url.substr(0, 4) != "fdm:")
    {
        var cm = new CookieManager;
        cm.getCookiesForUrl(url, dojob);
    }
    else
    {
        dojob();
    }    
};
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



if (browser.runtime.onMessageExternal){ // TODO: support it in FF

    browser.runtime.onMessageExternal.addListener(function (request, sender, sendResponse)
    {
        if (sender.url.toLowerCase().indexOf("https://files2.freedownloadmanager.org") == -1)
            return;
        if (request == "uninstall")
        {
            browser.management.uninstallSelf();
        }
    });
}

var fdmext;

function startExtension()
{
    fdmext = new FdmExtension;
    fdmext.initialize();
}

browser.declarativeNetRequest.getDynamicRules(previousRules => {
    const previousRuleIds = previousRules.map(rule => rule.id);
    browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: previousRuleIds,
        addRules: []
    }).then(startExtension());
})

browser.runtime.onInstalled.addListener(function(details) {
    const checkInterval = setInterval(() => {
        if (fdmext !== undefined) {
            clearInterval(checkInterval);
            fdmext.onInstalled(details);
        }
    }, 1000);
});
