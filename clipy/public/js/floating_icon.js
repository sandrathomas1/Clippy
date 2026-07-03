/**
 * AG Chat Widget — Floating AI Assistant
 * =======================================
 * Vanilla JavaScript. No dependencies.
 * Wrapped in an IIFE to avoid global scope pollution.
 * All DOM classes are namespaced with "ag-chat-".
 */
(function () {
    "use strict";

    /* Flag to prevent duplicate initialisation */
    var _agChatInitialised = false;

    /**
     * Build the complete widget HTML and inject it into the page.
     * Returns references to the key DOM nodes.
     */
    function buildWidget() {
        /* ---- Floating toggle button ---- */
        var toggle = document.createElement("button");
        toggle.className = "ag-chat-toggle";
        toggle.setAttribute("aria-label", "Open AI Assistant");
        toggle.setAttribute("title", "Open Assistant");
        toggle.innerHTML =
            '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" />' +
            '</svg>';

        /* ---- Chat window ---- */
        var widget = document.createElement("div");
        widget.className = "ag-chat-widget";
        widget.setAttribute("role", "dialog");
        widget.setAttribute("aria-label", "AI Assistant chat window");

        widget.innerHTML =
            /* Header */
            '<div class="ag-chat-header">' +
                '<span class="ag-chat-title">Assistant</span>' +
                '<button class="ag-chat-close" aria-label="Close chat">' +
                    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                        '<line x1="18" y1="6" x2="6" y2="18" stroke-width="2" stroke-linecap="round"/>' +
                        '<line x1="6" y1="6" x2="18" y2="18" stroke-width="2" stroke-linecap="round"/>' +
                    '</svg>' +
                '</button>' +
            '</div>' +

            /* Body */
            '<div class="ag-chat-body">' +
                '<p>Hi, how can I help today?</p>' +
            '</div>' +

            /* Footer / Input area */
            '<div class="ag-chat-footer">' +
                '<input class="ag-chat-input" type="text" ' +
                       'placeholder="Type a message" ' +
                       'aria-label="Type a message" />' +
                '<button class="ag-chat-send" aria-label="Send message">' +
                    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                        '<line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round"/>' +
                        '<polyline points="12 5 19 12 12 19" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
                    '</svg>' +
                '</button>' +
            '</div>';

        /* Inject into page */
        document.body.appendChild(toggle);
        document.body.appendChild(widget);

        return {
            toggle: toggle,
            widget: widget,
            closeBtn: widget.querySelector(".ag-chat-close"),
            sendBtn: widget.querySelector(".ag-chat-send"),
            input: widget.querySelector(".ag-chat-input"),
            body: widget.querySelector(".ag-chat-body")
        };
    }

    /**
     * Wire up all event handlers for the widget.
     */
    function initWidget() {
        if (_agChatInitialised) return;

        /* Prevent duplicate widgets if called more than once */
        if (document.querySelector(".ag-chat-toggle")) return;

        var els = buildWidget();
        _agChatInitialised = true;

        /* -- Open chat -- */
        els.toggle.addEventListener("click", function () {
            els.widget.classList.add("ag-chat-widget--open");
            els.toggle.classList.add("ag-chat-toggle--hidden");
            els.input.focus();
        });

        /* -- Close chat -- */
        els.closeBtn.addEventListener("click", function () {
            els.widget.classList.remove("ag-chat-widget--open");
            els.toggle.classList.remove("ag-chat-toggle--hidden");
        });

        /* -- Send message (example handler) -- */
        function handleSend() {
            var text = els.input.value.trim();
            if (!text) return;

            var msg = document.createElement("p");
            msg.className = "ag-chat-msg-user";
            msg.textContent = text;
            els.body.appendChild(msg);
            els.body.scrollTop = els.body.scrollHeight;
            els.input.value = "";
            els.input.focus();
        }

        els.sendBtn.addEventListener("click", handleSend);

        els.input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
            }
        });

        /* -- Close on Escape key -- */
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && els.widget.classList.contains("ag-chat-widget--open")) {
                els.widget.classList.remove("ag-chat-widget--open");
                els.toggle.classList.remove("ag-chat-toggle--hidden");
            }
        });
    }

    /* ---------------------------------------------------------
       Bootstrap — wait for DOM then initialise.
       Also listen for Frappe desk page-change if available.
       --------------------------------------------------------- */
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initWidget);
    } else {
        initWidget();
    }

    /* Frappe desk compatibility: re-check after route change */
    if (typeof $ !== "undefined") {
        $(document).on("page-change", function () {
            initWidget();
        });
    }
})();
