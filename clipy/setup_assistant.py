import frappe
import json

def setup():
    # 1. Create Tool Type if it doesn't exist
    if not frappe.db.exists("Agent Tool Type", "Frontend Actions"):
        doc = frappe.get_doc({
            "doctype": "Agent Tool Type",
            "name1": "Frontend Actions"
        })
        doc.insert(ignore_permissions=True)
        print("Created Agent Tool Type: Frontend Actions")

    tool_type = frappe.db.get_value("Agent Tool Type", {"name1": "Frontend Actions"}, "name")

    # 2. Create the "redirect_to_page" tool
    tool_name = "redirect_to_page"
    params_json = json.dumps({
        "type": "object",
        "properties": {
            "route": {
                "type": "string",
                "description": "The route to navigate to (e.g. 'List/User' or 'Form/Sales Invoice/new')"
            }
        },
        "required": ["route"]
    })

    if not frappe.db.exists("Agent Tool Function", tool_name):
        doc = frappe.get_doc({
            "doctype": "Agent Tool Function",
            "name": tool_name,
            "tool_name": tool_name,
            "tool_type": "Frontend Actions",
            "description": "Redirect the user to a specific page or route in Frappe/ERPNext Desk.",
            "is_client_side_tool": 1,
            "params": params_json,
            "parameters": [
                {
                    "label": "Route",
                    "fieldname": "route",
                    "type": "string",
                    "required": 1,
                    "description": "The route to navigate to (e.g. 'List/User' or 'Form/Sales Invoice/new')"
                }
            ]
        })
        doc.insert(ignore_permissions=True)
        print("Created Agent Tool Function: Redirect to Page")
    else:
        doc = frappe.get_doc("Agent Tool Function", tool_name)

        doc.params = params_json

        if not doc.parameters:
            doc.append("parameters", {
                "label": "Route",
                "fieldname": "route",
                "type": "string",
                "required": 1,
                "description": "The route to navigate to (e.g. 'List/User' or 'Form/Sales Invoice/new')"
            })
        doc.save(ignore_permissions=True)
        print("Updated Agent Tool Function parameters: Redirect to Page")

    # 3. Create Knowledge Source for Frappe/ERPNext docs
    ks_name = "Frappe ERPNext Docs"
    if not frappe.db.exists("Knowledge Source", ks_name):
        doc = frappe.get_doc({
            "doctype": "Knowledge Source",
            "source_name": ks_name,
            "description": "Documentation for Frappe and ERPNext",
            "knowledge_type": "sqlite_fts",
            "storage_mode": "Frappe File",
            "chunk_size": 1000,
            "chunk_overlap": 100
        })
        doc.insert(ignore_permissions=True)
        print("Created Knowledge Source: Frappe ERPNext Docs")

        # Add Knowledge Input
        ki = frappe.get_doc({
            "doctype": "Knowledge Input",
            "knowledge_source": ks_name,
            "input_type": "URL",
            "url": "https://frappeframework.com/docs"
        })
        ki.insert(ignore_permissions=True)

        ki2 = frappe.get_doc({
            "doctype": "Knowledge Input",
            "knowledge_source": ks_name,
            "input_type": "URL",
            "url": "https://docs.erpnext.com"
        })
        ki2.insert(ignore_permissions=True)
        print("Created Knowledge Inputs for Docs")

    # 4. Create or Update the Agent
    agent_name = "Frappe Support"

    instructions = """# Role & Identity
You are an expert-level Frappe Framework and ERPNext Support Assistant. Your core objective is to provide highly accurate, contextual, and actionable guidance to users. You operate as a senior software engineer and implementation expert.

# Core Capabilities
1. **Expert Guidance**: You possess deep knowledge of Frappe architecture, DocTypes, Server Scripts, Client Scripts, and ERPNext modules (Accounting, HR, Manufacturing, etc.).
2. **Context-Aware Navigation**: You can seamlessly navigate users to the correct screens, forms, or list views in their Frappe/ERPNext Desk using the provided `redirect_to_page` tool.
3. **Problem Solving**: You approach issues methodically, asking clarifying questions when necessary and offering best-practice solutions.

# Workflow & Guidelines
- **Always Consult Knowledge**: When answering technical questions or providing documentation links, prioritize using your linked Knowledge Sources.
- **Use Markdown**: Format all your responses using rich Markdown.
  - Use **bold** for emphasis.
  - Use `inline code` for field names, variables, and DocTypes.
  - Use code blocks (` ```python ` or ` ```javascript `) with comments for scripting examples.
  - Use lists and tables to organize complex information.
- **Proactive Assistance**: If a user asks "How do I create a Sales Invoice?", first explain the process briefly, and then automatically navigate them to the "Sales Invoice/new" page using your `redirect_to_page` tool.
- **Tone**: Maintain a professional, encouraging, and authoritative tone. Avoid robotic phrasing. Be concise but comprehensive.

# Navigation Tool Usage
When using the `redirect_to_page` tool:
- For List Views: `List/[DocType]` (e.g., `List/User`).
- For New Forms: `Form/[DocType]/new` (e.g., `Form/Sales Invoice/new`).
- For Existing Documents: `Form/[DocType]/[Name]`.
Do not prompt the user for confirmation to navigate if their intent is clear. Just execute the tool and inform them you are redirecting them."""

    if not frappe.db.exists("Agent", agent_name):
        provider_list = frappe.db.get_all("AI Provider", limit=1)
        provider = provider_list[0].name if provider_list else None
        if not provider:
            if not frappe.db.exists("AI Provider", "OpenAI"):
                provider_doc = frappe.get_doc({"doctype": "AI Provider", "provider_name": "OpenAI", "api_key": "dummy"})
                provider_doc.insert(ignore_permissions=True)
                provider = provider_doc.name
            else:
                provider = "OpenAI"

        model_list = frappe.db.get_all("AI Model", limit=1)
        model = model_list[0].name if model_list else None
        if not model:
            if not frappe.db.exists("AI Model", "gpt-4o"):
                model_doc = frappe.get_doc({"doctype": "AI Model", "model_name": "gpt-4o", "provider": provider})
                model_doc.insert(ignore_permissions=True)
                model = model_doc.name
            else:
                model = "gpt-4o"

        doc = frappe.get_doc({
            "doctype": "Agent",
            "agent_name": agent_name,
            "description": "Expert Assistant for Frappe and ERPNext Support.",
            "instructions": instructions,
            "temperature": 0.2,
            "provider": provider,
            "model": model,
            "allow_chat": 1,
            "agent_tool": [
                {
                    "tool": tool_name
                }
            ],
            "agent_knowledge": [
                {
                    "knowledge_source": ks_name,
                    "mode": "Optional",
                    "priority": 1
                }
            ]
        })
        doc.insert(ignore_permissions=True)
        print("Created Agent: Frappe Support")
    else:
        doc = frappe.get_doc("Agent", agent_name)
        doc.instructions = instructions
        doc.save(ignore_permissions=True)
        print("Updated Agent instructions: Frappe Support")

    # 5. Set Default Agent in Clipy Settings
    if frappe.db.exists("DocType", "Clipy Settings"):
        settings = frappe.get_single("Clipy Settings")
        settings.default_agent = agent_name
        settings.save(ignore_permissions=True)
        print("Set Frappe Support as default agent in Clipy Settings")

    frappe.db.commit()

if __name__ == "__main__":
    setup()
