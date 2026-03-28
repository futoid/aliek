---
title: "TCP vs UDP: A Practical Crash Course"
description: "How TCP and UDP work, their pros and cons, and when to choose each protocol in real systems."
author: "aliek"
date: 2026-03-27
topic: "devops"
layout: blog
---

TCP and UDP are both transport‑layer protocols that let machines send and receive data over a network. We have both for a reason: each one makes different trade‑offs between reliability, overhead, speed, and statefulness.

In this post I’m summarizing the key ideas, pros/cons, and simple demos that made the differences.

## Where TCP and UDP Live in the Stack

Both TCP and UDP sit at **Layer 4 – Transport** in the OSI model.

At this layer I care about two main things:

- **IP address**: which machine to talk to.
- **Port**: which application on that machine (80, 443, 5432, etc.).

Together, IP + port identify a specific endpoint process.

---

## TCP: Transmission Control Protocol

TCP is a **reliable, connection‑oriented, stateful** transport protocol.

### What TCP Gives Me (Pros)

1. **Acknowledgment (ACKs)**  
   Every piece of data (segment) has sequence information, and the receiver sends back ACKs to confirm delivery. If the sender doesn’t get an ACK, it assumes loss.

2. **Guaranteed delivery & retransmission**  
   If a segment is lost or corrupted, TCP retransmits until it either succeeds or gives up after timeouts.

3. **Connection‑based (stateful)**  
   A TCP connection is established with a handshake and then maintained as **state** on both client and server. Each side tracks things like sequence numbers, window sizes, and connection status.

4. **Congestion control**  
   TCP regulates how fast it sends data based on network conditions, like traffic lights controlling cars entering a highway. This prevents overwhelming routers and links.

5. **Ordered packets**  
   Segments may arrive out of order, but TCP reorders them before delivering bytes to the application. The app sees a clean, in‑order byte stream.

Because of all this, TCP is the default choice for protocols where correctness, ordering, and reliability are more important than raw speed (HTTP, databases, SSH, etc.).

### What TCP Costs Me (Cons)

The same features come with downsides:

- **Larger packets**: More header fields (sequence numbers, ACKs, flags) mean more bytes per message.
- **More bandwidth**: Extra metadata + retransmissions increase network usage.
- **Slower**: Waiting for ACKs, reordering, congestion control, and retransmission adds latency.
- **Stateful on server**: Each connection consumes memory and resources; many half‑open or malicious connections can lead to DoS.

If I restart a TCP server mid‑connection, the connection is gone. The client can’t just continue; it must reconnect because the state was held on the server and lost.

---

## TCP Demo: Simple Server Idea

A simple demo that illustrates TCP:

- Run a server that listens on `127.0.0.1:8080`.
- When a client connects (e.g., via `telnet`), the server sends `"Hello"`.
- Whenever the client types something, the server logs the raw bytes and text.

If the server process is killed while a client is connected, the client sees that the connection is closed and any in‑flight data is lost. That’s the practical face of TCP’s statefulness.

---

## UDP: User Datagram Protocol

UDP is a **connectionless, stateless, “best effort”** protocol.

### What UDP Removes (Compared to TCP)

UDP **does not provide**:

- **Acknowledgments**: No built‑in “I received this” messages.
- **Guaranteed delivery**: No retransmission; if a packet is lost, it’s just gone.
- **Congestion control**: It happily sends packets without caring about network load.
- **Ordering**: Packets may arrive out of order, and UDP doesn’t fix this.
- **Connection state**: There is no notion of a persistent connection at the protocol level.

This makes UDP inherently less “safe” if I care about every byte and strict order. Some firewalls even block UDP because there’s no handshake that can be used for basic trust.

### What UDP Buys Me (Pros)

Precisely because it drops those features, UDP gives:

- **Smaller headers** → smaller packets → less bandwidth.
- **Lower latency** → no waiting for ACKs, ordering, or congestion windows.
- **Statelessness** → servers don’t keep per‑client connection state; easy to horizontally scale.

For low‑bandwidth, intermittent networks (e.g., mobile games over weak connections), this can be a huge win. Applications can build only the reliability they truly need at a higher layer (“reliable UDP”).

---

## UDP Demo: Simple Server Idea

A minimal UDP demo:

- Create a UDP socket bound to port `8081` (IPv4).
- On each incoming message, log the payload and sender info (IP + port).
- Use `nc -u 127.0.0.1 8081` or similar to send datagrams.

Two important behaviors stand out:

1. There is never a “connected” state; datagrams are just sent and received.
2. You can stop and restart the server, and the client can keep sending without renegotiating any connection.

That’s UDP’s stateless behavior in action.

---

## Choosing Between TCP and UDP

A practical guideline: **match the protocol to the problem**.

- **Pick TCP when**:
  - You need reliability and ordering (databases, secure chat, web apps, APIs).
  - Packet loss or corruption is unacceptable.
  - Per‑connection overhead is acceptable relative to data volume.

- **Pick UDP when**:
  - You can tolerate some loss or occasional corruption (games, live video, voice).
  - Latency and bandwidth efficiency matter more than perfect delivery.
  - You’re ready to implement just enough reliability at the application layer (e.g., sequence numbers in a game protocol).

Common examples:

- **DNS** often uses UDP: small, stateless request‑response, easy to retry.
- **Streaming and gaming** often leverage UDP to avoid TCP’s head‑of‑line blocking and heavy overhead, sometimes layering their own reliability on top.
- **Databases and critical business traffic** almost always rely on TCP because correctness is more important than shaving a few milliseconds.

---

## Final Mental Model

Here’s the way I now think about these protocols:

- TCP is like a **reliable, ordered conversation** with receipts and flow control. Slower, heavier, but safe.
- UDP is like **throwing postcards** as fast as possible. Some might get lost or arrive out of order, but you don’t pay for the overhead you don’t need.

Understanding these trade‑offs, and seeing them in small code examples, makes it much easier to choose the right tool for any networked application I build next.

---

## Reference Video

- TCP vs UDP Crash Course: [here](https://www.youtube.com/watch?v=qqRYkcta6IE)
