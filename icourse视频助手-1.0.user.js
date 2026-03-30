// ==UserScript==
// @name         icourse视频助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  支持自定义快捷键：F全屏, Space播放, Shift+数字跳转。支持iframe。
// @author       峦江 (Gemini Assisted)
// @match        *://icourse.fudan.edu.cn/*
// @grant        none
// @run-at       document-start
// @allFrames    true
// ==/UserScript==

(function() {
    'use strict';

    /* ------------------------------------------------------------------------------- */
    /* -------------------- 键盘快捷键（需要刷新页面使其生效）------------------------ */
    /* ----- KEYBOARD SHORTCUTS (MUST Refresh PAGE FOR CHANGES TO TAKE EFFECT) ------- */
    /* ------------------------------------------------------------------------------- */
    const CONFIG = {
        // single key 单按键
        singleKey: {
            fullscreen: 'KeyF',
            playPause: 'Space',
        },

        // --- Shift key 需要SHIFT按键
        shiftKey: {
            jumpTo3min: 'Digit3',//shift+3
            forward5min: 'Digit5',//shift+5
        },

        // ---time change 有关SHIFT key相应的time的改动（以秒为单位）
        time: {
            jumpPoint: 180,//一般来讲，icourse会提前3分钟开始录制
            forwardStep: 300,//例如，如果你想快进十分钟，就把这个改成600
        }
    };
    /* ############################################################################### */
    /* ##### DON'T MODIFY ANYTHING BELOW HERE UNLESS YOU KNOW WHAT YOU ARE DOING ##### */
    /* ################## 不要改任何下面的代码除非你知道你在干什么 ################### */
    /* ############################################################################### */

    // 1. 注入 CSS 补丁
    const injectStyle = () => {
        if (document.getElementById('video-fix')) return;
        const style = document.createElement('style');
        style.id = 'video-fix';
        style.textContent = `
        .video_lay:fullscreen, .video_lay:-webkit-full-screen {
            background-color: #000 !important;
            width: 100vw !important; height: 100vh !important;
            display: flex !important; flex-direction: column !important;
        }
        .video_lay:fullscreen div[class*="layer"],
        .video_lay:fullscreen div[class*="wrapper"],
        .video_lay:fullscreen div[class*="container"],
        .video_lay:fullscreen video {
            width: 100% !important; height: 100% !important;
            min-width: 100% !important; min-height: 100% !important;
            display: block !important; position: relative !important;
        }
    `;
        (document.head || document.documentElement).appendChild(style);
    };
    injectStyle();

    // 2. 键盘事件处理器
    const handleKey = (event) => {
        // 打字时不触发
        const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) ||
                         document.activeElement.isContentEditable;
        if (isTyping) return;

        const video = document.querySelector('video');
        if (!video) return;

        if (event.shiftKey) {
            // 跳转
            if (event.code === CONFIG.shiftKey.jumpTo3min) {
                event.preventDefault();
                event.stopImmediatePropagation();
                video.currentTime = CONFIG.time.jumpPoint;
                video.play();
            }
            // 快进
            if (event.code === CONFIG.shiftKey.forward5min) {
                event.preventDefault();
                event.stopImmediatePropagation();
                video.currentTime += CONFIG.time.forwardStep;
                video.play();
            }
        }

        else {
            // 播放/暂停
            if (event.code === CONFIG.singleKey.playPause) {
                event.preventDefault();
                event.stopImmediatePropagation();
                video.paused ? video.play() : video.pause();
            }
            // 全屏
            if (event.code === CONFIG.singleKey.fullscreen) {
                event.preventDefault();
                event.stopImmediatePropagation();
                const target = document.querySelector('.video_lay') || document.body;
                if (!document.fullscreenElement) {
                    target.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen();
                }
            }
        }
    };

    window.addEventListener('keydown', handleKey, true);

})();