#
# Copyright (C) 2024 gSpot (https://github.com/gSpotx2f/luci-app-cpu-perf)
#
# This is free software, licensed under the MIT License.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-cpu-perf
PKG_VERSION:=0.4.1
PKG_RELEASE:=1
LUCI_TITLE:=CPU performance information and management for LuCI
LUCI_DEPENDS:=+lua +luci-lib-nixio +luci-lib-jsonc
LUCI_PKGARCH:=all
PKG_LICENSE:=MIT

#include ../../luci.mk
include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
