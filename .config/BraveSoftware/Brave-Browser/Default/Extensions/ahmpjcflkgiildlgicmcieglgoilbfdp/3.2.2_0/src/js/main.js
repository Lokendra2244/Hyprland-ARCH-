
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
