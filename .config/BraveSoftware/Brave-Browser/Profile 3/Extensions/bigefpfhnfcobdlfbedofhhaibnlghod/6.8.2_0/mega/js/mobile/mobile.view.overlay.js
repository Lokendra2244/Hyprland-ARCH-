class MegaMobileViewOverlay extends MegaComponent {

    constructor(options) {
        super(options);

        if (!this.domNode) {
            return;
        }

        this.domNode.classList.add('custom-alpha', 'overlay-wrap');

        const overlay = document.createElement('div');
        overlay.className = `${options.wrapperClassname} custom-alpha`;
        this.domNode.appendChild(overlay);

        // Build container
        overlay.append(document.getElementById('view-file-template').content.cloneNode(true));

        // Build header
        const backLink = new MegaLink({
            parentNode: overlay.querySelector('.media-viewer-menu'),
            type: 'icon',
            componentClassname: 'text-icon back',
            icon: 'sprite-mobile-fm-mono icon-arrow-left-thin-outline',
            iconSize: 24
        });
        backLink.on('tap.back', async() => {

            if (this.mode === 'text') {
                document.activeElement.blur();
            }

            if (typeof this.confirmDiscard === 'function' && !await this.confirmDiscard()) {
                return false;
            }

            if (this.nodeComponent && this.nodeComponent.previewable) {
                history.back();
            }

            this.hide();
        });

        const contextMenuButton = new MegaButton({
            type: 'icon',
            parentNode: overlay.querySelector('.media-viewer-menu'),
            icon: 'sprite-mobile-fm-mono icon-more-horizontal-thin-outline',
            iconSize: 24,
            componentClassname: 'context-btn open-context-menu text-icon'
        });
        contextMenuButton.on('tap', () => {
            if (this.nodeComponent) {
                if (!mega.ui.contextMenu) {
                    mega.ui.contextMenu = new MegaMobileContextMenu();
                }

                this.trigger('pauseStreamer');

                if (this.mode === 'text') {
                    document.activeElement.blur();
                }

                mega.ui.contextMenu.show(this.nodeComponent.handle);
            }
            return false;
        });

        // Stop native zoom in
        this.domNode.addEventListener('touchmove', event => {

            if (event.touches.length > 1) {
                event.preventDefault();
            }
        });
    }

    get mode() {

        if (!this.visible) {
            return false;
        }
        else if (this.nodeComponent.previewable) {
            return this.nodeComponent.previewable;
        }
        else if (this.isInfo) {
            return 'info';
        }

        return 'normal';
    }

    get visible() {
        return this.domNode && this.domNode.classList.contains('active');
    }

    /**
     * Show the layout when it fails to load the first time (e.g. for deactivated accounts visiting a file link)
     * @param {String} nodeHandle A public or regular node handle
     * @returns {void}
     */
    async showLayout(nodeHandle) {
        this.setNode(nodeHandle);

        // Bind hide events
        this.bindEvents();

        // Update media preview or item properties UI
        await this.updateContent(nodeHandle);

        if (!is_video(this.nodeComponent.node)) {
            this.domNode.querySelector('.video-block').classList.add('hidden');
        }

        this.domNode.querySelector('.media-viewer').scrollTo(0, 0);
        this.domNode.querySelector('.media-viewer-container').classList.remove('hidden');
        this.domNode.querySelector('.img-wrap').classList.add('hidden');
        this.domNode.querySelector('.gallery-btn.previous').classList.add('hidden');
        this.domNode.querySelector('.gallery-btn.next').classList.add('hidden');
        this.domNode.querySelector('.viewer-pending').classList.add('hidden');

        this.domNode.classList.add('active');
        this.domNode.parentNode.classList.remove('hidden');

        mainlayout.classList.add('fm-overlay-link');

        mobile.appBanner.updateBanner(nodeHandle);
    }

    /**
     * Show the overlay
     * @param {String} nodeHandle A public or regular node handle
     * @param {Boolean} isInfo File/folder information
     * @returns {void}
     */
    async show(nodeHandle, isInfo) {
        this.setNode(nodeHandle);
        this.isInfo = isInfo || this.isInfo; // Keep cached param when updating the content

        // Show preview ot properties UI
        await this.updateContent(nodeHandle);

        if (this.visible) {
            // Make sure resize is triggered after hidden is gone for render media viewer
            $(window).trigger('resize');
            return;
        }

        // Bind hide events
        this.bindEvents();

        // Show view file overlay
        this.domNode.querySelector('.media-viewer').scrollTo(0, 0);
        this.domNode.parentNode.classList.remove('hidden');
        this.domNode.classList.add('active');
        const fmlist = document.getElementById('file-manager-list-container');

        if (fmlist) {
            fmlist.classList.add('hidden');
        }

        if (this.nodeComponent.node.link) {
            mainlayout.classList.add('fm-overlay-link');
        }
        else {
            mainlayout.classList.add('fm-overlay-view');
        }

        mobile.appBanner.updateBanner(nodeHandle);

        // if (mega.flags.ab_ads) {
            mega.commercials.updateOverlays();
        // }
    }

    /**
     * Hide the overlay
     * @returns {void}
     */
    hide() {
        if (!this.visible) {
            return false;
        }

        this.domNode.classList.remove('active');

        const fmlist = M.v.length > 0 && document.getElementById('file-manager-list-container');

        if (fmlist) {

            fmlist.classList.remove('hidden');

            // make sure resize is triggered after hidden is gone for render megalist correctly
            $(window).trigger('resize');
        }

        mainlayout.classList.remove('fm-overlay-view', 'fm-overlay-link');

        if (mobile.cloud.bottomBar) {
            mobile.cloud.bottomBar.show();
        }

        if (folderlink) {
            const bannerHandle = M.currentdirid === M.currentrootid ? pfid : M.currentdirid;
            mobile.appBanner.updateBanner(bannerHandle);
        }
        else {
            mobile.appBanner.hide();
        }

        // if (mega.flags.ab_ads) {
            mega.commercials.updateOverlays();
        // }

        // Unbind close the viewer event listeners
        if (this.bpcListener) {
            mBroadcaster.removeListener(this.bpcListener);
            delete this.bpcListener;
        }
        window.removeEventListener('popstate', this._hide);

        if (window.textEditorVisible) {
            mega.textEditorUI.doClose();
        }

        delete this._hide;
        delete this.versionHandle;
        delete this.nodeComponent;
        delete this.isInfo;
    }

    /**
     * Bind close the viewer event listeners
     * @returns {void}
     */
    bindEvents() {
        if (!this._hide) {
            this._hide = () => this.hide();

            console.assert(!this.bpcListener, 'check this..');
            this.bpcListener = mBroadcaster.addListener('beforepagechange', this._hide);

            window.addEventListener('popstate', this._hide);
        }
    }

    /**
     * Update media preview or item properties UI
     * @param {String} nodeHandle A public or regular node handle
     * @returns {void}
     */
    async updateContent(nodeHandle) {
        const isPreviewable = !this.isInfo && this.nodeComponent.previewable;
        const isLink = this.nodeComponent.node.link;
        const downloadSupport = await MegaMobileViewOverlay.checkSupport(this.nodeComponent.node);

        // Build bottom bar
        if (this.bottomBar) {
            this.bottomBar.destroy();
        }

        if (!M.currentrootid || M.currentrootid !== M.RubbishID) {

            const actions = this.getActionsArray(downloadSupport, isLink, isPreviewable, this.isInfo);

            if (actions) {
                this.bottomBar = new MegaMobileBottomBar({
                    parentNode: this.domNode.querySelector('.media-viewer-container footer .image-controls'),
                    actions: actions,
                    adWrapper: 'adFile'
                });
            }

            if (mobile.cloud.bottomBar) {
                mobile.cloud.bottomBar.hide();
            }
        }

        // Hide context button
        const textBlock = this.domNode.querySelector('.media-viewer-container .text-editor-container');
        textBlock.classList.add('hidden');

        if (isPreviewable && isPreviewable !== 'text') {
            this.domNode.querySelector('.context-btn').classList.remove('hidden');
            this.domNode.querySelector('.media-viewer-container .content').classList.remove('hidden');
            this.domNode.querySelector('.media-viewer-container .content-info').classList.add('hidden');
        }
        else {
            // If user taps the browser's back button, push fake states of history/hash so they
            // only go back one page rather than two (ref: imagesViewer.js 935 - 956)
            if (page !== 'download') {
                pushHistoryState(page);
            }

            this.domNode.querySelector('.media-viewer-container .content').classList.add('hidden');
            this.domNode.querySelector('.media-viewer-container').classList.remove('hidden');

            const props = getNodeProperties(nodeHandle);
            const propsNode = this.domNode.querySelector('.media-viewer-container .properties-content');
            const iconNode = this.domNode.querySelector('.media-viewer-container .filetype-img');
            const infoNode = this.domNode.querySelector('.media-viewer-container .content-info');

            // Hide context menu button and video controls in Properties overlay
            if (this.isInfo) {
                this.domNode.querySelector('.context-btn').classList.add('hidden');
                this.domNode.querySelector('.video-controls').classList.add('hidden');
            }
            else {
                this.domNode.querySelector('.context-btn').classList.remove('hidden');
                this.domNode.querySelector('.video-controls').classList.remove('hidden');
            }

            // Set default
            infoNode.classList.remove('hidden');
            iconNode.textContent = '';
            propsNode.textContent = '';
            infoNode.scrollTo(0, 0);

            // Set selected item data
            mCreateElement('i', {'class': this.nodeComponent.icon}, iconNode);
            this.domNode.querySelector('.media-viewer-container .file-name').textContent =
                (pfcol && l[6859]) || props.t2 || this.nodeComponent.name;

            // Show "Too large file" or "Non-viewable" warnings
            if (!downloadSupport || !this.isInfo) {
                this.inlineAlert = mobile.inline.alert.create({
                    parentNode: propsNode,
                    text: downloadSupport ? l.non_viewable_item_info : l.view_file_too_large,
                    icon: 'sprite-mobile-fm-mono icon-info-thin-outline',
                    iconSize: '24',
                    closeButton: false,
                    componentClassname: 'warning',
                });
            }

            // Fill properties data
            if (props) {
                propsNode.append(parseHTML(getPropertiesContent(props)));

                // Render breadcrumbs or hide
                if (page === 'download') {
                    this.domNode.querySelector('.properties-breadcrumb').classList.add('hidden');
                }
                else if (!pfcol) {
                    M.renderPathBreadcrumbs(
                        nodeHandle,
                        document.querySelector('.properties-breadcrumb .fm-breadcrumbs-wrapper')
                    );
                }
            }

            if (isPreviewable === 'text') {

                infoNode.classList.add('hidden');
                textBlock.classList.remove('hidden');
                const contentBlock = textBlock.querySelector('.content');
                contentBlock.classList.add('v-hidden');
                loadingDialog.show();

                if (this.bottomBar && !dlid) {
                    this.bottomBar.actions[0].disabled = true;
                }

                const $contianer = dlid ? $('.js-text-viewer', textBlock) : undefined;
                mega.textEditorUI.cleanup();

                mega.fileTextEditor.getFile(nodeHandle)
                    .then(data =>
                        mega.textEditorUI.setupEditor(
                            this.nodeComponent.name,
                            data,
                            nodeHandle,
                            isLink,
                            $contianer
                        )
                    )
                    .then(() => {

                        contentBlock.classList.remove('v-hidden');

                        const changeHandler = () => {
                            this.confirmDiscard = () => mobile.messageOverlay.show(
                                l.file_request_confirm_close_page,
                                l.file_request_discard_changes,
                                'sprite-mobile-fm-mono icon-alert-triangle-thin-outline warning',
                                [l.file_request_discard_btn],
                                false,
                                true
                            ).then(() => true).catch(() => false);

                            this.bottomBar.actions[0].disabled = false;
                        };

                        this.versionHandle = '';

                        mega.textEditorUI.editor.on('change', changeHandler);

                        // Override for mobile version
                        mega.textEditorUI.doClose = () => {
                            mega.textEditorUI.editor.off('change', changeHandler);
                            delete this.confirmDiscard;
                            window.textEditorVisible = false;
                        };
                    })
                    .catch(dump)
                    .finally(() => {
                        loadingDialog.hide();
                    });
            }
        }
    }

    /**
     * Set current node
     * @param {String} nodeHandle A public or regular node handle
     * @returns {void}
     */
    setNode(nodeHandle) {
        this.nodeComponent = MegaNodeComponent.getNodeComponentByHandle(nodeHandle) ||
            new MegaNodeComponent({parentNode: document.createElement('div'), nodeHandle});

        this.domNode.querySelector('.media-viewer-container .file-name').textContent = this.nodeComponent.name;

        if (is_video(this.nodeComponent.node)) {

            this.rebind('pauseStreamer', () => {

                const video = mega.ui.viewerOverlay.domNode.querySelector('#mobile-video');

                if (video && !video.paused && !video.ended) {
                    video.pause();
                }
            });
        }
        else {
            this.off('pauseStreamer');
        }
    }

    /**
     * Get actions depending of file parameters
     * @param {Boolean} downloadSupport File downloadable
     * @param {Boolean} isLink File Link
     * @param {String} isPreviewable File type of Previewable contents
     * @param {Boolean} isInfo File/folder information
     * @returns {Array} Array with applicable actions
     */
    getActionsArray(downloadSupport, isLink, isPreviewable, isInfo) {

        const buttons = {
            'openappButton' : ['openapp-button', l.view_file_open_in_app, () => {
                if (!this.nodeComponent) {
                    return false;
                }
                eventlog(99912);

                this.trigger('pauseStreamer');
                goToMobileApp(MegaMobileViewOverlay.getAppLink(this.nodeComponent.handle));
            }],

            'downloadButton': ['download-button', pfcol ? l[58] : 'icon-download-thin', () => {
                if (!validateUserAction() || !this.nodeComponent) {
                    return false;
                }

                this.trigger('pauseStreamer');
                mobile.downloadOverlay.startDownload(this.nodeComponent.handle);
                eventlog(99913);
                return false;
            }],

            'sharelinkButton': [
                'sharelink-button',
                MegaMobileViewOverlay.getLinkText(this.nodeComponent.handle), () => {
                    if (!validateUserAction() || !this.nodeComponent) {
                        return false;
                    }
                    this.trigger('pauseStreamer');
                    mobile.linkManagement.checkCopyRightAndGetLink(this.nodeComponent.handle);
                    return false;
                }
            ],

            'slideshowButton': ['slideshow-button', 'icon-play-square-thin-outline', () => {
                $('.media-viewer-container footer .v-btn.slideshow').trigger('click');
            }],

            'saveTextButton': ['save-text-button', l[776], MegaMobileContextMenu.menuItems['.save-text'].onClick]
        };

        const shareBtn = M.currentrootid !== 'shares' && [buttons.sharelinkButton];

        if (pfcol) {
            const arr = [[buttons.downloadButton]];

            if (!this.isInfo && is_image3(M.d[this.nodeComponent.handle])) {
                arr.push([buttons.slideshowButton]);
            }

            return arr;
        }
        if (!downloadSupport) {
            return [[buttons.openappButton]];
        }
        if (isLink) {
            return [[buttons.openappButton], [buttons.downloadButton]];
        }
        if (isInfo) {
            return shareBtn && [shareBtn];
        }
        if (isPreviewable && isPreviewable !== 'text') {
            return [shareBtn, [buttons.downloadButton, buttons.slideshowButton]];
        }
        if (isPreviewable === 'text' && this.nodeComponent.rights) {

            const _origFunc = buttons.downloadButton[2];

            buttons.downloadButton[2] = () => {

                // If something is changed
                if (this.confirmDiscard) {

                    return mobile.messageOverlay.show(
                        l[22750],
                        l[22753],
                        'sprite-mobile-fm-mono icon-alert-triangle-thin-outline warning',
                        [l[78]],
                        false,
                        true
                    ).then(_origFunc).catch(nop);
                }

                _origFunc();
            };

            return [[buttons.saveTextButton], [buttons.downloadButton]];
        }
        return [shareBtn, [buttons.downloadButton]];
    }

    /**
     * Gets the relevant link for the app depending on if a public file link, public folder link or in the cloud drive
     *
     * @param {String} nodeHandle The internal node handle of the folder or file
     * @returns {String} Returns an app link in the following format:
     *
     * 1) #!<public-file-handle>!<key> Generic public file link, downloads the file. This scenario is handled by
     * the direct download page logic not here.
     * 2) #F!<public-folder-handle>!<key> Generic public folder link, opens the folder for viewing.
     * 3) #F!<public-folder-handle>!<key>!<internal-node-handle> Public folder link that will open the sub folder
     * for viewing if the internal node handle is a folder, or will start downloading the file if the internal node
     * handle is a file.
     * 4) #<internal-node-handle> If the internal node handle is a folder and they are logged into the same
     * account, it opens the folder for viewing in the app. If it is a file and they are logged into the same account,
     * then it starts downloading the file. If the internal node handle is not recognised in that account, the app will
     * throw an error dialog saying they need to log into that account.
     */
    static getAppLink(nodeHandle) {

        // If a public file link, add the base file handle and key
        if (typeof dlpage_ph !== 'undefined' && typeof dlpage_key !== 'undefined') {
            return `#!${  dlpage_ph  }!${  dlpage_key}`;
        }

        // Otherwise if a public folder
        else if (pfid && pfkey) {

            // If it is a public collection/set
            if (pfcol) {
                const handle_suffix = nodeHandle !== undefined && nodeHandle !== pfid
                    ? `!${nodeHandle}`
                    : '';

                return `collection/${pfid}#${pfkey}${handle_suffix}`;
            }
            // If subfolder or file is specified, add it to the base folder handle and key
            else if (nodeHandle === undefined || pfid === nodeHandle) {
                // Otherwise return the base folder handle and key
                return `#F!${  pfid  }!${  pfkey}`;
            }

            return `#F!${  pfid  }!${  pfkey  }!${  nodeHandle}`;
        }

        // Otherwise if in regular cloud drive, return just the node handle
        return `#${  nodeHandle}`;
    }

    /**
     * Gets Share button label
     *
     * @param {String} nodeHandle The internal node handle of the folder or file
     * @returns {String}
     */
    static getLinkText(nodeHandle) {

        var publicLinks = 0;
        var getLinkText = '';

        nodeHandle = typeof nodeHandle === 'string' && [nodeHandle] || nodeHandle || $.selected || [];

        // Loop through all selected nodes
        for (var i = 0; i < nodeHandle.length; i++) {

            // If it has a public link, then increment the count
            if (M.getNodeShare(nodeHandle[i])) {
                publicLinks++;
            }
        }

        // If all the selected nodes have existing public links, set text to 'Manage links' or 'Manage link'
        if (nodeHandle.length === publicLinks) {
            getLinkText = nodeHandle.length > 1 ? l[17520] : l[6909];
        }
        else {
            // Otherwise change text to 'Share links' or 'Share link' if there are selected nodes without links
            getLinkText = mega.icu.format(l.share_link, nodeHandle.length);
        }
        return getLinkText;
    }

    /**
     * Check if the download is supported for current mobile browser & OS
     *
     * @param {Object} node Node
     * @returns {Promise}
     */
    static async checkSupport(node) {

        let supported = true;

        if (is_uc_browser || node.type === 1 && is_ios || ua.details.brand === 'Edgios') {
            supported = false;
        }
        else {
            const maxFileSize =  await dlmanager.getMaximumDownloadSize();

            if ((node.t === 1 ? node.tb : node.s) > maxFileSize || !dlmanager.canSaveToDisk(node)) {
                supported = false;
            }
        }

        return supported;
    }

    static init() {

        // Create and handle a specific overlay for file view
        // Note that this will be displayed inside the file-manager-block
        mega.ui.viewerOverlay = new MegaMobileViewOverlay({
            parentNode: document.querySelector(`#${is_fm() ? 'fmholder' : 'startholder'} .file-manager-block`),
            componentClassname: 'mega-overlay mega-overlay-view',
            wrapperClassname: 'overlay'
        });

        mobile.appBanner.hide();
    }
}
