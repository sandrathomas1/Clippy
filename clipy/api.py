import frappe
from huf.ai.conversation_manager import ConversationManager

@frappe.whitelist()
def get_or_create_conversation(agent_name):
    """
    Returns the active conversation ID for the user and agent.
    Creates a new one if it doesn't exist.
    """
    if not agent_name:
        frappe.throw("Agent name is required")

    conv_manager = ConversationManager(
        agent_name=agent_name,
        channel="api",
        external_id=None # Defaults to frappe.session.user
    )

    conversation = conv_manager.get_or_create_conversation()
    return conversation.name
