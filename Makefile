SVN_SERVER              := http://svn.teligent.ru/teligent/core
BUILD_TOOLS_SVN_TAG	:= F_BUILD_2_0_17
SPEC_DEFAULTS_TAG	:= tags/0.1.4

MODULE		:= osdkjs
MODULE_LO	:= $(shell echo $(MODULE) | tr A-Z a-z)
PRODUCT		:= osdp
PRODUCT_UP	:= $(shell echo $(PRODUCT) | tr a-z A-Z)

################################################################################
# Only change the lines below if you want to change dependencies in the build
################################################################################

BUILD_TOOLS_SVN_PATH := builds/build_tools
BUILD_TOOLS_MODULE   := build_tools

# Needs to be specified before include
RPM_NAME             := $(MODULE_LO)

# global_start contains common targets and defined Make variables used in this file
-include $(BUILD_TOOLS_MODULE)/global_start.mak

# Modules to run make in
# Used in do-make target
MAKE_MODULES := $(BP)/src

# RPM file parameters used during do-package
# Used in do-package target
RPM_VERSION	:= $(VERSION)
RPM_RELEASE	:= $(P90_SDK_VERSION)_$(DIST)
RPM_SPEC_FILE	:= $(BP)/app.spec

# Specify file server, location on file server and packages to copy to file server
# Used in scp target
DIST_LOCATION	:= $(DIST_LOCATION_BASE)/products/$(PRODUCT)/$(MODULE)/.
PACKAGES        := $(wildcard $(BP)/osdkjs-*.tar.gz)
REPORT_LOCATION := $(DIST_LOCATION_BASE)/products/$(PRODUCT)/$(MODULE)/.log/
REPORT          := $(wildcard $(BP)/html/*)


all: build do-report

build_tools/global_start.mak :.
	svn co -q $(SVN_SERVER)/$(BUILD_TOOLS_SVN_PATH)/tags/$(BUILD_TOOLS_SVN_TAG) $(BUILD_TOOLS_MODULE)

build:
	npm install | tee -a $(LOGFILE)

	#all
	grunt --osdktag="$(VERSION)" build builddocs | tee -a $(LOGFILE)
	mv built/minified osdkjs | tee -a $(LOGFILE)
	tar cvzf $(BP)/osdkjs-$(VERSION).tar.gz osdkjs | tee -a $(LOGFILE)
	echo "Wrote: $(BP)/osdkjs-$(VERSION).tar.gz"
	mv built/clean osdkjs-devel | tee -a $(LOGFILE)
	tar cvzf $(BP)/osdkjs-devel-$(VERSION).tar.gz osdkjs-devel | tee -a $(LOGFILE)
	echo "Wrote: $(BP)/osdkjs-devel-$(VERSION).tar.gz"
	mv builtdocs osdkjs-docs | tee -a $(LOGFILE)
	tar cvzf $(BP)/osdkjs-docs-$(VERSION).tar.gz osdkjs-docs | tee -a $(LOGFILE)
	echo "Wrote: $(BP)/osdkjs-docs-$(VERSION).tar.gz"

	grunt --osdktag="$(VERSION)" build builddocs --nosip | tee -a $(LOGFILE)
	mv built/minified osdkjs-nosip | tee -a $(LOGFILE)
	tar cvzf $(BP)/osdkjs-nosip-$(VERSION).tar.gz osdkjs-nosip | tee -a $(LOGFILE)
	echo "Wrote: $(BP)/osdkjs-nosip-$(VERSION).tar.gz"
	mv built/clean osdkjs-nosip-devel | tee -a $(LOGFILE)
	tar cvzf $(BP)/osdkjs-nosip-devel-$(VERSION).tar.gz osdkjs-nosip-devel | tee -a $(LOGFILE)
	echo "Wrote: $(BP)/osdkjs-nosip-devel-$(VERSION).tar.gz"
	mv builtdocs osdkjs-nosip-docs | tee -a $(LOGFILE)
	tar cvzf $(BP)/osdkjs-nosip-docs-$(VERSION).tar.gz osdkjs-nosip-docs | tee -a $(LOGFILE)
	echo "Wrote: $(BP)/osdkjs-nosip-docs-$(VERSION).tar.gz"

	grunt --osdktag="$(VERSION)" build builddocs --noxmpp | tee -a $(LOGFILE)
	mv built/minified osdkjs-noxmpp | tee -a $(LOGFILE)
	tar cvzf $(BP)/osdkjs-noxmpp-$(VERSION).tar.gz osdkjs-noxmpp | tee -a $(LOGFILE)
	echo "Wrote: $(BP)/osdkjs-noxmpp-$(VERSION).tar.gz"
	mv built/clean osdkjs-noxmpp-devel | tee -a $(LOGFILE)
	tar cvzf $(BP)/osdkjs-noxmpp-devel-$(VERSION).tar.gz osdkjs-noxmpp-devel | tee -a $(LOGFILE)
	echo "Wrote: $(BP)/osdkjs-noxmpp-devel-$(VERSION).tar.gz"
	mv builtdocs osdkjs-noxmpp-docs | tee -a $(LOGFILE)
	tar cvzf $(BP)/osdkjs-noxmpp-docs-$(VERSION).tar.gz osdkjs-noxmpp-docs | tee -a $(LOGFILE)
	echo "Wrote: $(BP)/osdkjs-noxmpp-docs-$(VERSION).tar.gz"

	grunt --osdktag="$(VERSION)" build builddocs --nosip --noxmpp | tee -a $(LOGFILE)
	mv built/minified osdkjs-nosip-noxmpp | tee -a $(LOGFILE)
	tar cvzf $(BP)/osdkjs-nosip-noxmpp-$(VERSION).tar.gz osdkjs-nosip-noxmpp | tee -a $(LOGFILE)
	echo "Wrote: $(BP)/osdkjs-nosip-noxmpp-$(VERSION).tar.gz"
	mv built/clean osdkjs-nosip-noxmpp-devel | tee -a $(LOGFILE)
	tar cvzf $(BP)/osdkjs-nosip-noxmpp-devel-$(VERSION).tar.gz osdkjs-nosip-noxmpp-devel | tee -a $(LOGFILE)
	echo "Wrote: $(BP)/osdkjs-nosip-noxmpp-devel-$(VERSION).tar.gz"
	mv builtdocs osdkjs-nosip-noxmpp-docs | tee -a $(LOGFILE)
	tar cvzf $(BP)/osdkjs-nosip-noxmpp-docs-$(VERSION).tar.gz osdkjs-nosip-noxmpp-docs | tee -a $(LOGFILE)
	echo "Wrote: $(BP)/osdkjs-nosip-noxmpp-docs-$(VERSION).tar.gz"

clean:
	git clean -dxf
