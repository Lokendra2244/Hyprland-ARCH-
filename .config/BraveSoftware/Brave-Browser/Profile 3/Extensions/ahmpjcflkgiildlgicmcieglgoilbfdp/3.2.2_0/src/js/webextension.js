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
