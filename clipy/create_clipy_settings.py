import frappe

def create():
    if not frappe.db.exists("Module Def", "Clipy"):
        doc = frappe.get_doc({
            "doctype": "Module Def",
            "module_name": "Clipy",
            "app_name": "clipy"
        })
        doc.insert()

    if frappe.db.exists("DocType", "Clipy Settings"):
        print("Clipy Settings already exists.")
        return

    doc = frappe.get_doc({
        "doctype": "DocType",
        "name": "Clipy Settings",
        "module": "Clipy",
        "custom": 0,
        "issingle": 1,
        "fields": [
            {
                "fieldname": "default_agent",
                "label": "Default Agent",
                "fieldtype": "Link",
                "options": "Agent",
                "reqd": 1
            }
        ]
    })
    doc.insert()
    frappe.db.commit()
    print("Created Clipy Settings DocType")

create()
