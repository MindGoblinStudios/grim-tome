# Privacy Policy

**Effective date:** October 8, 2026

This Privacy Policy describes how **Mind Goblin Studios, LLC** ("Mind Goblin Studios," "we," "us," or "our") handles information in connection with **Grimoire's Tome**, an open-source plugin of skills (a coding wizard and AI council) for ChatGPT, Codex, and other agent tools.

Mind Goblin Studios, LLC is a Delaware limited liability company operated from Washington State, USA.

## 1. What Grimoire's Tome is

Grimoire's Tome is a **skills-only plugin**. It is a package of instructions, reference files, helper scripts, and local workbench pages. It runs **inside the AI agent you already use**. We do not operate a Grimoire's Tome account system, dashboard, or cloud backend for the plugin. The plugin does not phone home, and we do not ship telemetry, analytics, advertising pixels, or crash reporters.

Using the plugin is optional. You can stop using it, uninstall it, or delete a local copy at any time.

## 2. Information we do not collect from plugin use

When you run Grimoire's Tome skills in your agent, **Mind Goblin Studios does not receive**:

- your chats, prompts, or agent transcripts
- files, code, or project contents your agent reads or writes
- email, calendar, finance, or other connected-account data
- location, device identifiers, or advertising IDs
- usage metrics, skill-invocation logs, or crash reports

We do not sell personal information. We do not use plugin usage data for advertising.

## 3. Information that may be processed elsewhere

The plugin can cause your **own tools** to process information. That processing happens on your machine, in your host app, or with providers **you** connect. Mind Goblin Studios is not a recipient of that data unless you separately send it to us (for example, by opening a GitHub issue).

### Host AI platforms

If you use Grimoire's Tome in ChatGPT, Codex, Cursor, Claude, Grok, or another agent host, that host processes your conversation and any files, commands, or tools you allow. Their privacy policies and terms apply. We do not receive a copy from the plugin.

### Local chat-log search

The chat-log search skill can read **local** Codex, Claude Code, and Cursor logs on your computer (for example under `~/.codex`, `~/.claude`, and `~/.cursor`). It is read-only. Results stay on your machine unless you or your host send them somewhere else.

### Email triage

The Postmaster email-triage skill can read and act on mail **only if you have connected a mail tool** to your agent (for example a mail MCP or CLI). It uses only the inboxes you designate. Mail stays with your mail provider and your host. We do not receive your email.

### Finance and other connected tools

Some advisor skills (for example money or business admin) may use finance or other sources **if you have already connected them** to your agent. We do not receive those records.

### Optional model runners (Minion)

If you explicitly use the Minion skill's outside runners, prompts may be sent:

- to a **local** model host you run (for example LM Studio or Ollama on `127.0.0.1`), or
- to **OpenRouter**, using **your** API key (`OPENROUTER_API_KEY`), if you choose that route

We do not receive those prompts. OpenRouter (or your local host) processes them under its own terms.

### Local workbench server

Workbench and relic-artifact skills can start a **local** HTTP server on your computer (by default `127.0.0.1`, commonly port `8765`) to serve project files and workbench state. You can optionally bind it to your local network so a phone on the same Wi-Fi can open it. That server is yours. It does not send data to Mind Goblin Studios.

### Files, git, and terminal

Developer skills instruct your agent to use tools you have already enabled: reading and writing files, git, a terminal, a browser, and similar. That work happens in your environment and on your host. We do not receive it.

### Web research

Research-style skills may ask your host to search the web or open public pages. Search and browsing follow your host's tools and policies.

### Generated pages

Skills that generate HTML artifacts may load a pinned library from a public CDN when the page needs it. That is a request from your browser to the CDN, not a report to us.

### Installing and updating

Cloning or pulling the public repository, or installing the plugin from GitHub or a directory, is handled by GitHub, your host, and your network. Those services may log ordinary traffic such as IP address and user agent. We do not run a separate download tracker.

## 4. Information we may receive if you contact us or pay

### GitHub Issues (support)

The contact method for this project is the public Issues page:

https://github.com/MindGoblinStudios/grim-tome/issues

If you open an issue, comment, or otherwise post on that repository, GitHub and Mind Goblin Studios can see what you submit (for example your GitHub username, the text of the issue, and any attachments). Use that page only for information you are willing to share. GitHub's privacy policy also applies.

<!-- Support email: add a monitored mailbox here when one is confirmed. -->

### Optional payments

Supporters may optionally pay through payment links listed in the project README (processed by **Stripe**) or through **GitHub Sponsors**.

- **Stripe** handles the payment under [Stripe's terms and privacy policy](https://stripe.com/privacy). We receive ordinary payment and supporter information Stripe provides to a merchant (for example name, email, payment status, amount, and limited card details such as brand and last four digits). We do not receive your full card number.
- **GitHub Sponsors** is handled by GitHub under GitHub's terms. We may see your GitHub identity and sponsorship status.

Paying is optional. The plugin works without payment. This policy does not list prices or checkout links.

### Public repository activity

If you star, fork, sponsor, or contribute to the public repository, GitHub may show that activity publicly according to your GitHub settings.

## 5. How we use information we receive

We use GitHub issue and repository information to respond to support and to maintain the project. We use Stripe (and, if applicable, GitHub Sponsors) information to process optional support payments, keep records, and meet accounting and legal obligations. We do not use this information to advertise third-party products.

## 6. Recipients

Depending on how you interact with us, recipients may include:

| Recipient | Why |
| --- | --- |
| **GitHub** | Hosts the public repository, issues, and optional sponsorships |
| **Stripe** | Processes optional payments you choose to make |
| **Your AI host** (OpenAI, and any other agent you use) | Runs the plugin inside your session |
| **Providers you connect** (mail, finance, OpenRouter, CDNs, and similar) | Only when you use those tools |

We do not sell this information. We may disclose information if required by law, to protect rights and safety, or in connection with a business transfer of Mind Goblin Studios, LLC.

## 7. Retention

- **Plugin usage:** we do not receive it, so we do not retain it.
- **GitHub issues and repository data:** kept according to GitHub and our project records until removed or the repository is changed.
- **Payment records:** kept as needed for bookkeeping, tax, dispute, and legal requirements.

## 8. Your choices

- Uninstall the plugin or delete your local copy.
- Do not connect mail, finance, or other tools you do not want your agent to use.
- Do not run chat-log search, Minion outside runners, or the local workbench server if you do not want those skills to touch those sources.
- Control what your host AI platform stores in that platform's settings.
- Edit or close GitHub issues you opened, subject to GitHub's tools.
- For Stripe payments, use Stripe's and your payment method's support channels for billing questions.

If you are in a place with privacy rights (for example access, correction, or deletion), contact us through GitHub Issues and we will handle the request we can. Some data lives only on your device or with your host; we cannot retrieve or delete what we never received.

## 9. Children

Grimoire's Tome is intended for users **13 and older**. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has sent us personal information through GitHub Issues or a payment, tell us through the Issues page and we will delete what we can.

## 10. International users

Mind Goblin Studios is operated from Washington State, USA. GitHub, Stripe, and your AI host may process data in the United States or other countries. If you use the plugin or contact us from outside the United States, you understand that information you send to us or those providers may be processed in the United States.

## 11. Changes

We may update this Privacy Policy. The effective date at the top will change when we do. The current version lives in this repository. Continued use after an update means you accept the revised policy.

## 12. Contact

For privacy questions about Grimoire's Tome, open an issue:

**https://github.com/MindGoblinStudios/grim-tome/issues**

<!-- Support email: add a monitored mailbox here when one is confirmed. -->
