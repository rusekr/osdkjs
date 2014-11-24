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

BUILD_OSDKJS = ( mv built/minified $(2); \
tar cvzf $(BP)/$(2)-$(VERSION).tar.gz $(2); \
echo "Wrote: $(BP)/$(2)-$(VERSION).tar.gz"; \
mv built/clean $(2)-devel; \
tar cvzf $(BP)/$(2)-devel-$(VERSION).tar.gz $(2)-devel; \
echo "Wrote: $(BP)/$(2)-devel-$(VERSION).tar.gz"; \
if [ -d builtdocs ]; then \
mv builtdocs $(2)-docs; \
tar cvzf $(BP)/$(2)-docs-$(VERSION).tar.gz $(2)-docs; \
echo "Wrote: $(BP)/$(2)-docs-$(VERSION).tar.gz"; \
fi ) | tee -a $(LOGFILE)

build:
	npm install | tee -a $(LOGFILE)
	grunt --osdktag="$(VERSION)" build
#all modules devel + prod + docs
	$(call BUILD_OSDKJS,builddocs,osdkjs)
#all modules except sip, devel + prod
	$(call BUILD_OSDKJS,--nosip=true,osdkjs-nosip)
#all modules except xmpp, devel + prod
	$(call BUILD_OSDKJS,--noxmpp=true,osdkjs-noxmpp)
#all modules except sip and xmpp, devel + prod
	$(call BUILD_OSDKJS,--nosip=true --noxmpp=true,osdkjs-nosip-noxmpp)

clean:
	git clean -dxf
