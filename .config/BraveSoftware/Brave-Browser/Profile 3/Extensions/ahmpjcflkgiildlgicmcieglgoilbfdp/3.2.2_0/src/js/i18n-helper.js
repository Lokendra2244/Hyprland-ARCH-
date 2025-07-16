const i18nHelper = {
    localizePage: function() {
        try {
            const elements = document.querySelectorAll('[data-i18n]');
            for (const element of elements) {
                const key = element.getAttribute('data-i18n');
                if (key) {
                    // Get all additional parameters for placeholders
                    const placeholders = element.getAttribute('data-i18n-params');
                    const params = placeholders ?
                        placeholders.split(',').map(param => browser.i18n.getMessage(param)) :
                        [];

                    // Apply the translation with the provided parameters
                    const message = browser.i18n.getMessage(key, params);

                    // If the message contains HTML tags, use innerHTML instead of textContent
                    if (message.includes('<')) {
                        element.innerHTML = message;
                    } else {
                        element.textContent = message;
                    }
                }
            }
        } catch (error) {
            console.error('Error during localization:', error);
        }
    }
};
