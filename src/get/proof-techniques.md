---
title: "5 Essential Methods of Proof in Discrete Mathematics"
description: "Direct, contraposition, contradiction, counterexample, induction—essential for theorems in sets, logic, and combinatorics."
author: "aliek"
date: 2026-02-02
topic: "math"
layout: blog
---

Discrete mathematics underpins logic, sets, graphs, and algorithms. Mastering proofs ensures theorems hold across infinite structures. Here are the five fundamental methods, with precise examples from number theory and logic.

## 1. Direct Proof

Start with hypotheses and derive the conclusion using definitions and axioms.

**Theorem**: For integer \( n \), if \( n \) is even, then \( n^2 \) is even.

**Proof**: Let \( n = 2k \) for integer \( k \). Then \( n^2 = (2k)^2 = 4k^2 = 2(2k^2) \), so \( n^2 \) is even.

## 2. Proof by Contraposition

To prove \( P \implies Q \), show \( \neg Q \implies \neg P \).

**Theorem**: If \( n^2 \) is even, then \( n \) is even.

**Contrapositive**: If \( n \) is odd, then \( n^2 \) is odd.  
**Proof**: Let \( n = 2k + 1 \). Then \( n^2 = (2k+1)^2 = 4k^2 + 4k + 1 = 2(2k^2 + 2k) + 1 \), which is odd.

## 3. Proof by Contradiction

Assume the negation and derive a contradiction.

**Theorem**: \( \sqrt{2} \) is irrational.

**Proof**: Suppose \( \sqrt{2} = \frac{p}{q} \) in lowest terms (\( p, q \) integers, \( q \neq 0 \)). Then \( p^2 = 2q^2 \), so \( p^2 \) even implies \( p \) even: \( p = 2m \). Substitute: \( 4m^2 = 2q^2 \implies q^2 = 2m^2 \), so \( q \) even. Both even contradicts lowest terms.

## 4. Disproof by Counterexample

Refute a universal claim with one violating instance.

**Claim**: Every prime is odd.  
**Counterexample**: 2 is prime and even.

## 5. Proof by Mathematical Induction

Prove for all \( n \geq n_0 \): base case + inductive step.

**Theorem**: \( 1 + 2 + \dots + n = \frac{n(n+1)}{2} \) for \( n \geq 1 \).

**Proof**:

- **Base Case** (\( n=1 \)): Left: 1; right: \( \frac{1 \cdot 2}{2} = 1 \).
- **Inductive Step**: Assume true for \( k \): \( \sum*{i=1}^k i = \frac{k(k+1)}{2} \). For \( k+1 \):  
  \( \sum*{i=1}^{k+1} i = \frac{k(k+1)}{2} + (k+1) = \frac{k(k+1) + 2(k+1)}{2} = \frac{(k+1)(k+2)}{2} \).

| Method         | Proves                  | Common In                  |
| -------------- | ----------------------- | -------------------------- |
| Direct         | Implications            | Parity, divisibility       |
| Contraposition | Conditionals            | Number theory              |
| Contradiction  | Irrationals, uniqueness | Logic, sets                |
| Counterexample | Disproves universals    | Testing claims             |
| Induction      | Infinite sequences      | Combinatorics, recurrences |

## Key Takeaways

Direct and contraposition build chains; contradiction exposes impossibilities; counterexamples prune falsehoods; induction scales to infinity. Practice on graph theory or pigeonhole principle next.

---
