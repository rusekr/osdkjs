# openSDP oSDK Javascript Library Reference Manual #

## Introduction ##

<p>This library is provided for easier usage of openSDP platform services in your browser.

## Architecture ##

<p>oSDK consists of modules, some of modules are required and some are optional. Modules such as XMPP or SIP can be switched off on time of building custom oSDK for your needs. Building oSDK without some modules deprives you from using APIs provided by that modules. For example: building without SIP module will make oSDK library really small but you can not make and receive audio and video calls with it. Building oSDK without XMPP module makes sense if you intend not to use contantact lists, user statuses or text messaging.

![architecture](images/teligentsdk.svg)

## Getting started ##

<p>You can start configuring oSDK with [Core API](CoreAPI.html) and then try to connect to openSDP network with [Connection API](ConnectionAPI.html).

<p>[Capabilities API](CapabilitiesAPI.html) allows you to detect hardware and browser capabilities like if you can make audio or video calls.

<p>[Media API](MediaAPI.html) provides you with media calls capabilities. With it's functions you can make video or audio calls.

<p>[Messaging API](MessagingAPI.html) provides you with texting capabilities. You can send or receive text messages with it.

<p>[Presence API](PresenceAPI.html) allows you to exchange your statuses with other users of openSDP network.

<p>[Roster API](RosterAPI.html) grants you access to managing of current user's contact list.

## Tutorials ##

<p>[Simple texting application](tutorial1.html)
