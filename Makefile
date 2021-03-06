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

BUILD_OSDKJS = ( cd $(BP)/built/minified; \
tar cvzf $(BP)/$(1)-$(VERSION).tar.gz $(1); \
echo "Wrote: $(BP)/$(1)-$(VERSION).tar.gz"; \
cd $(BP)/built/clean; \
tar cvzf $(BP)/$(1)-devel-$(VERSION).tar.gz $(1)-devel; \
echo "Wrote: $(BP)/$(1)-devel-$(VERSION).tar.gz" ) | tee -a $(BP)/$(LOGFILE)

build:
	npm install | tee -a $(BP)/$(LOGFILE)
	grunt --osdktag="$(VERSION)" buildall | tee -a $(BP)/$(LOGFILE)
#all modules devel + prod
	$(call BUILD_OSDKJS,osdkjs)
#base + sip, devel + prod
	$(call BUILD_OSDKJS,osdkjs-base-sip)
#base + xmpp, devel + prod
	$(call BUILD_OSDKJS,osdkjs-base-xmpp)
#base, devel + prod
	$(call BUILD_OSDKJS,osdkjs-base)
#documentation
	cd $(BP)
	mv built/documentation osdkjs-documentation
	tar cvzf osdkjs-documentation-$(VERSION).tar.gz osdkjs-documentation
	echo "Wrote: osdkjs-documentation-$(VERSION).tar.gz"

clean:
	git clean -dxf
