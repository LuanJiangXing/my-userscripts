// ==UserScript==
// @name         icourse视频助手
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  支持自定义快捷键：F全屏, Space播放, Shift+数字跳转, X/C调速。支持倍速记忆。
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
            speedDown: 'KeyX', // 按 X 降低倍速或恢复 1x
            speedUp: 'KeyC',   // 按 C 提高倍速至 1.25x (可自行修改)
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
        },

        // ---speed change 倍速设置
        speed: {
            default: 1.0,
            target: 1.25, //可修改成你想要的配速
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

    // 2. 深度扫描函数 (递归穿透用于自动勾选)
    const findInShadows = (selector, root = document) => {
        let found = root.querySelector(selector);
        if (found) return found;
        const allNodes = root.querySelectorAll('*');
        for (const node of allNodes) {
            if (node.shadowRoot) {
                found = findInShadows(selector, node.shadowRoot);
                if (found) return found;
            }
        }
        return null;
    };

    // 3. 自动勾选逻辑 (仅处理勾选，不处理确认)
    const solveShadowCheck = () => {
        const checkbox = findInShadows('.el-checkbox');
        if (checkbox && !checkbox.classList.contains('is-checked')) {
            checkbox.click();
            console.log('[助手] 已自动勾选协议，请手动点击“确认”');
        }
    };

    // 4. 倍速应用逻辑 (带记忆功能)
    const applySavedSpeed = () => {
        const video = document.querySelector('video');
        if (!video) return;
        const savedSpeed = localStorage.getItem('icourse-atlas-speed') || CONFIG.speed.default;
        if (video.playbackRate !== parseFloat(savedSpeed)) {
            video.playbackRate = parseFloat(savedSpeed);
            console.log('[助手] 已应用保存的倍速: ' + savedSpeed + 'x');
        }
    };

    // 5. 键盘事件处理器
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
            // 倍速切换：提高至目标倍速
            if (event.code === CONFIG.singleKey.speedUp) {
                video.playbackRate = CONFIG.speed.target;
                localStorage.setItem('icourse-atlas-speed', CONFIG.speed.target);
                console.log('[助手] 当前倍速: ' + video.playbackRate + 'x');
            }
            // 倍速切换：恢复 1x
            if (event.code === CONFIG.singleKey.speedDown) {
                video.playbackRate = CONFIG.speed.default;
                localStorage.setItem('icourse-atlas-speed', CONFIG.speed.default);
                console.log('[助手] 当前倍速: ' + video.playbackRate + 'x');
            }
        }
    };

    // --- 启动与监听 ---
    window.addEventListener('keydown', handleKey, true);

    // 每 0.5 秒低频检查一次弹窗，并尝试恢复记忆的倍速
    setInterval(() => {
        solveShadowCheck();
        applySavedSpeed();
    }, 500);

})();