# Copyright (c) 2026, sandra and Contributors
# See license.txt

import frappe
from frappe.tests import IntegrationTestCase, UnitTestCase


# OnlyOneIntegrationTestCase will run the integration tests only for
# temporary until the PR is merged in frappe-bench.
EXTRA_TEST_RECORD_DEPENDENCIES = []  # List of doctypes to populate before test


class UnitTestClipySettings(UnitTestCase):
	"""
	Unit tests for ClipySettings.
	Use this class for testing individual functions and methods.
	"""

	pass


class IntegrationTestClipySettings(IntegrationTestCase):
	"""
	Integration tests for ClipySettings.
	Use this class for testing interactions between multiple components.
	"""

	pass
