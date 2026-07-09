import frappe
def run():
    doc = frappe.get_doc("Agent Tool Function", "redirect_to_page")
    print("Function Definition:", doc.function_definition)
