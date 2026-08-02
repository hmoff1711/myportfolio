# Hikmat Mahammadov — Infrastructure Portfolio

## Professional focus

This repository contains the professional portfolio of Hikmat Mahammadov, an IT Infrastructure Specialist focused on Windows systems administration, Active Directory, Microsoft 365, Dell EMC Isilon / OneFS, endpoint deployment and evidence-based L1/L2 troubleshooting.

## Live site

[hmoff1711.github.io/myportfolio](https://hmoff1711.github.io/myportfolio/)

## Repository contents

The portfolio is a lightweight static site built with semantic HTML, modern CSS and vanilla JavaScript. It includes:

- professional focus and technical expertise;
- selected, sanitised infrastructure case studies;
- employment history, education, coursework and languages;
- a downloadable resume and vCard;
- accessible light and dark themes;
- responsive layouts for desktop, tablet and mobile.

## Featured case studies

- **OneFS SMB access:** group-based access design, ACL and ownership normalization, validated access paths and a documented owner-repair control for newly created files.
- **ProFTPD SFTP diagnosis:** service hardening, time-dependent throughput comparison and an evidence-based network-path escalation boundary.
- **Remote Access Plus pilot:** HTTPS hardening, certificate validation, startup-GPO controls and an intentional deployment quality gate.
- **Operational incident notes:** targeted Windows SMB credential-state isolation and HP MFP DNS troubleshooting.

All examples are sanitised and distinguish verified outcomes from the next operational or escalation step.

## Local run instructions

No build step or package installation is required. From the repository root, run a local static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## Repository structure

```text
.
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
├── images/
│   ├── anthony.jpg
│   └── cover.jpg
├── cv/
│   ├── Hikmat_Mahammadov_Resume.pdf
│   └── hikmat.vcf
├── favicon.png
├── favicon.svg
├── robots.txt
└── sitemap.xml
```

## Privacy and security

- Case studies exclude credentials, internal addresses, employer-only records and confidential configuration data.
- The contact form is processed by the external Airform service; this is disclosed next to the form.
- External links that open a new tab use `noopener noreferrer`.
- The repository intentionally contains no production scripts, private keys, secrets or employer configuration exports.

## Contact

- Email: [hikmet2000.hg@gmail.com](mailto:hikmet2000.hg@gmail.com)
- LinkedIn: [linkedin.com/in/hmoff1711](https://www.linkedin.com/in/hmoff1711/)
- GitHub: [github.com/hmoff1711](https://github.com/hmoff1711)
- Portfolio: [hmoff1711.github.io/myportfolio](https://hmoff1711.github.io/myportfolio/)
