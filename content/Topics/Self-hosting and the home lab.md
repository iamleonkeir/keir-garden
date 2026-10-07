---
title: Self-hosting and the home lab
tags:
  - sprout
---

## Why run my own

Partly ownership: my notes, my music, my course, on machines I control. Mostly learning. You don't really understand something until you've broken it and had to put it back together.

## What runs here

A small family of machines, each named after something from myth and legend:

- **A Raspberry Pi** that does most of the work: it blocks ads for the house, sends alerts to my phone, and serves the [[Awakening Your Light Body]] course to invited learners
- **An old iMac** from 2009, given a second life as an archive
- **A free cloud server**, for things that need to be always on
- **A laptop for learning security**, the kind of tools used to test defences

They're joined by a private network, so they can talk to each other from anywhere without being exposed to the internet. The one public door, for the course, goes through Cloudflare, which checks who you are before anything at home is reached.

## Lessons

- **"It works" isn't "it survives a reboot."** Prove it by rebooting.
- **Update the system but not the wifi driver, and the wifi dies on the next boot.** Then there's no wifi to download the fix. Keep a way back.
- **Check that the encryption is really on.** An installer screen can look identical either way.
- **Patience is a strategy.** Free cloud servers are scarce; mine came from a script that kept asking, thousands of times over, until one was free.
