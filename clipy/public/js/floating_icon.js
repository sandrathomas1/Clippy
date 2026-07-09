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
    var _agentName = null;
    var _conversationId = null;
    var _isFetchingAgent = false;

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
                '<div class="ag-chat-msg-agent">Hi, how can I help today?</div>' +
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

        /* Fetch the agent name and conversation in background */
        if (typeof frappe !== "undefined" && frappe.db) {
            _isFetchingAgent = true;
            frappe.db.get_single_value("Clipy Settings", "default_agent")
                .then(function(val) {
                    _agentName = val;
                    if (_agentName) {
                        return frappe.call({
                            method: "clipy.api.get_or_create_conversation",
                            args: { agent_name: _agentName }
                        });
                    }
                })
                .then(function(r) {
                    if (r && r.message) {
                        _conversationId = r.message;
                        setupRealtimeListener();
                    }
                })
                .finally(function() {
                    _isFetchingAgent = false;
                });
        }

        function setupRealtimeListener() {
            if (!_conversationId || !frappe.realtime) return;

            // Remove existing listener to avoid duplicates if re-initialized
            frappe.realtime.off('conversation:' + _conversationId);

            frappe.realtime.on('conversation:' + _conversationId, function(data) {
                if (data && data.type === 'frontend_tool_call_initiated') {
                    if (data.function_name === 'redirect_to_page') {
                        var route = data.tool_params.route;
                        if (route) {
                            frappe.set_route(route);
                        }
                    }
                }
            });
        }

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

        /* -- Send message handler -- */
        function handleSend() {
            var text = els.input.value.trim();
            if (!text) return;

            appendMessage(text, 'user');
            els.input.value = "";
            els.input.focus();

            if (typeof frappe === "undefined") {
                appendMessage("Frappe object not found. Cannot connect to Agent.", 'agent');
                return;
            }

            if (_isFetchingAgent) {
                setTimeout(handleSend, 500); // Wait briefly
                return;
            }

            if (!_agentName) {
                appendMessage("No Default Agent configured in Clipy Settings.", 'agent');
                return;
            }

            var typingIndicator = showTypingIndicator(els.body);

            frappe.call({
                method: "huf.ai.chat_api.run_agent_sync_chat",
                args: {
                    agent_name: _agentName,
                    prompt: text,
                    create_new: !_conversationId,
                    conversation_id: _conversationId
                },
                callback: function(r) {
                    removeTypingIndicator(typingIndicator);
                    if (r.message) {
                        var run_result = r.message;
                        if (run_result.conversation_id) {
                            _conversationId = run_result.conversation_id;
                        }

                        /* Process client-side tool calls directly from API response
                           This bypasses the need for Socket.IO events to reach the frontend */
                        if (run_result.client_side_tool_calls && run_result.client_side_tool_calls.length > 0) {
                            var tools = run_result.client_side_tool_calls;
                            for (var i = 0; i < tools.length; i++) {
                                var call = tools[i];
                                if (call.function && call.function.name === 'redirect_to_page') {
                                    try {
                                        var args = typeof call.function.arguments === 'string'
                                            ? JSON.parse(call.function.arguments)
                                            : call.function.arguments;

                                        if (args && args.route) {
                                            frappe.set_route(args.route);
                                        }
                                    } catch (err) {
                                        console.error("Error parsing redirect_to_page arguments:", err);
                                    }
                                }
                            }
                        }

                        var agentText = run_result.response || run_result.result || "No response";
                        var formattedText = typeof frappe.markdown === "function" ? frappe.markdown(agentText) : agentText;
                        appendMessage(formattedText, 'agent', true);
                    } else if (r.exc) {
                         appendMessage("An error occurred.", 'agent');
                    }
                },
                error: function(r) {
                    removeTypingIndicator(typingIndicator);
                    appendMessage("Failed to connect to agent.", 'agent');
                }
            });
        }

        function appendMessage(text, role, isHtml) {
            var msgContainer = document.createElement("div");
            msgContainer.className = role === 'user' ? "ag-chat-msg-user" : "ag-chat-msg-agent";

            if (isHtml) {
                msgContainer.innerHTML = text;
            } else {
                msgContainer.textContent = text;
            }

            els.body.appendChild(msgContainer);
            els.body.scrollTop = els.body.scrollHeight;
        }

        function showTypingIndicator(body) {
            var indicator = document.createElement("div");
            indicator.className = "ag-chat-typing";
            indicator.innerHTML = '<div class="ag-chat-typing-dot"></div><div class="ag-chat-typing-dot"></div><div class="ag-chat-typing-dot"></div>';
            body.appendChild(indicator);
            body.scrollTop = body.scrollHeight;
            return indicator;
        }

        function removeTypingIndicator(indicator) {
            if (indicator && indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
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
