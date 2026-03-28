---
title: "OSI Model"
description: "A practical walkthrough of all 7 OSI layers using a simple end-to-end network flow, from bits on the wire to an HTTP request."
author: "aliek"
date: 2026-03-27
topic: "devops"
layout: blog
---

The OSI model often gets dismissed as textbook theory, but I’ve found it to be one of the most useful mental models for understanding networks. Once I walked through a real request from one machine to another—step by step—each layer suddenly made sense.

In this post, I’ll go through all seven layers using a simple exeampl: sending an HTTP request from my machi neto a server. I’ll start at the top (where we usually write code) and drill all the way down to bits on the wire.

---

## Why I Still Care About the OSI Model

Most of the tools I use daily—reverse proxies, load balancers, TLS, HTTP, databases—sit on top of the same networking stack. Without a mental model like OSI, a lot of that feels like black magic.

The OSI model gives me:

- A vocabulary to describe _where_ a problem lives (L2 vs L7).
- A way to map tools and protocols to specific layers.
- A structured way to reason about performance and failures.

Think of it as a layered debugger for the network.

---

## Layer 7 – Application: Where My Code Lives

I start at the top because this is where I usually work.

At the application layer, I’m building things like:

- An HTTP `GET /` or `POST /login` request.
- Headers, cookies, and body (JSON, HTML, etc.).
- A target host and port (for example, IP of the server on port 443).

Here, the data is just a well‑formed HTTP message. I don’t care yet how it becomes bytes or how it travels; I just know _what_ I want to send.

---

## Layer 6 – Presentation: Making Data Transmittable

Before this data can be pushed down the stack, it needs to be turned into a consistent representation.

Typical work at the presentation layer:

- **Serialization**: converting in‑memory objects into strings or byte sequences (for example, JSON serialization).
- **Compression**: shrinking payloads so they travel faster.
- **Encryption/Decryption**: turning plaintext into ciphertext and back (TLS commonly gets associated here).

In practice, I usually don’t think “I’m now at layer 6”; my frameworks just handle JSON encoding, TLS, and compression for me. But conceptually, this is the layer that prepares data for the journey.

---

## Layer 5 – Session: Managing Conversations

The session layer is about managing ongoing conversations between endpoints.

Conceptually, it can:

- Establish, maintain, and tear down sessions.
- Track which messages belong to which logical “conversation”.

In modern stacks, a lot of this either lives lower (in TCP) or higher (in application sessions like cookies or tokens), so layers 5 and 6 often feel “blurred”. Still, it’s useful to remember that there’s a conceptual layer responsible for the idea of a _session_.

---

## Layer 4 – Transport: Ports and Reliability

Layer 4 is where things get very concrete again.

Here I have protocols like:

- **TCP**: reliable, connection‑oriented.
- **UDP**: connectionless, no guarantees.

For TCP, this layer provides:

- **Ports**: source and destination ports to deliver data to the right process (80, 443, 5432, etc.).
- **Reliability**: sequence numbers, acknowledgments, retransmissions, in‑order delivery.
- **Segmentation**: breaking the data into manageable **segments**.

My HTTP request from layer 7 (already serialized and maybe encrypted/compressed) reaches layer 4, where TCP wraps it with headers: source port, destination port, sequence numbers, flags, and so on. At this point, I have a **TCP segment**.

---

## Layer 3 – Network: IP and Routing

Layer 3 introduces logical addressing and routing through IP.

Responsibilities here:

- Assign **source IP** and **destination IP**.
- Decide how to move packets across networks using routing tables.
- Allow traffic to cross multiple hops (routers) to reach a remote network.

Once layer 3 adds its header to the TCP segment, I get an **IP packet**.

Routers mostly live at this layer: they look at the destination IP, consult their routing tables, and forward packets accordingly, without needing to understand the full payload.

---

## Layer 2 – Data Link: Frames and MAC Addresses

Before the packet can be turned into raw bits, it needs to be prepared for the local network segment.

Layer 2 provides:

- **MAC addresses**: unique identifiers for network interfaces on a local network.
- **Frames**: units that include destination MAC, source MAC, and the encapsulated IP packet.
- **Local delivery**: deciding how to move data within a single LAN.

A few key ideas I keep in mind:

- MAC addresses are only meaningful on the local segment.
- If the destination IP is outside my subnet, the frame is actually sent to the **default gateway’s MAC address**, not directly to the final server’s MAC.
- Protocols like ARP map IP addresses to MAC addresses on the LAN.

Switches work entirely at this layer: they look at MAC addresses, maintain MAC tables, and forward frames accordingly.

---

## Layer 1 – Physical: Bits on a Medium

Finally, at the bottom, everything becomes raw bits.

Layer 1 is about:

- **Medium**: copper (electrical signals), radio (Wi‑Fi, Bluetooth), or fiber (light).
- **Encoding**: how 0s and 1s are represented as voltages, frequencies, or light pulses.
- **Transmission**: pushing those encoded bits across the physical link.

At this level, there is no notion of IP, ports, or HTTP. It’s just carefully timed changes in a physical signal that, when interpreted correctly, reconstruct frames, packets, segments, and finally the original HTTP request.

---

## Encapsulation: The Full Journey Down and Up

Walking through the full encapsulation from my machine to the server:

1. **Application (L7)**: I create an HTTP request.
2. **Presentation (L6)**: It’s serialized (and maybe encrypted/compressed).
3. **Session (L5)**: The conversation is conceptually part of a session.
4. **Transport (L4)**: TCP adds ports and reliability → **segment**.
5. **Network (L3)**: IP adds logical addresses → **packet**.
6. **Data Link (L2)**: MAC addresses and frame header/trailer → **frame**.
7. **Physical (L1)**: The frame becomes bits on a medium.

On the receiving side, everything happens in reverse:

- The device reads bits and reconstructs frames (L1 → L2).
- Frames are checked and stripped to reveal packets (L2 → L3).
- Packets are routed to the correct transport endpoint (L3 → L4).
- TCP reassembles the stream, verifies order and integrity (L4).
- The application‑level payload is decrypted, decompressed, and parsed (L5–L7).
- Finally, the server sees a clean HTTP request.

Each device along the path only looks as high as it needs:

- A switch: up to L2 (MAC).
- A router: up to L3 (IP), sometimes L4 for things like NAT and basic firewall rules.
- Application proxies: up to L7, fully understanding HTTP.

---

## OSI vs TCP/IP and Why I Still Use OSI

In practice, a lot of people prefer the simpler TCP/IP model with fewer layers, because:

- Presentation (L6) and session (L5) are rarely explicit in implementations.
- Their responsibilities are often split between application logic and TCP.

Even so, I still find the OSI model helpful as a conceptual map. When something breaks, I can ask:

- Is this a **physical** issue (cable, Wi‑Fi, interface)?
- Is this a **link** issue (MAC, VLAN, switch)?
- Is this a **network** issue (IP, routing, subnets)?
- Is this a **transport** issue (ports, TCP state, congestion)?
- Or is this purely an **application** problem (HTTP, JSON, business logic)?

That layered way of thinking has made debugging and designing networked systems a lot more systematic for me.

---
