/**
 * Accessibility tests — verify WCAG 2.1 AA compliance markers in the Home page
 * These tests check that key accessibility attributes are present in the source.
 */
import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";
import path from "path";

const homePath = path.resolve(__dirname, "../client/src/pages/Home.tsx");
const homeSource = readFileSync(homePath, "utf-8");

const indexCssPath = path.resolve(__dirname, "../client/src/index.css");
const indexCss = readFileSync(indexCssPath, "utf-8");

describe("Accessibility: Home.tsx", () => {
  it("has a skip-to-main-content link", () => {
    expect(homeSource).toContain('href="#main-content"');
    expect(homeSource).toContain("Skip to main content");
  });

  it("has a main landmark with id=main-content", () => {
    expect(homeSource).toContain('id="main-content"');
    expect(homeSource).toContain("<main");
  });

  it("desktop nav has aria-label", () => {
    expect(homeSource).toContain('aria-label="Site navigation"');
  });

  it("mobile nav has aria-label", () => {
    expect(homeSource).toContain('aria-label="Mobile site navigation"');
  });

  it("nav buttons have aria-label and aria-current", () => {
    expect(homeSource).toContain("aria-label={`Navigate to ${s} section`}");
    expect(homeSource).toContain("aria-current={active === s");
  });

  it("icon-only nav links have aria-label", () => {
    expect(homeSource).toContain('aria-label="GitHub profile (opens in new tab)"');
    expect(homeSource).toContain('aria-label="LinkedIn profile (opens in new tab)"');
    expect(homeSource).toContain('aria-label="Google Scholar profile (opens in new tab)"');
  });

  it("decorative canvas has aria-hidden", () => {
    expect(homeSource).toContain('aria-hidden="true"\n      role="presentation"');
  });

  it("hero background image has aria-hidden", () => {
    expect(homeSource).toContain('aria-hidden="true"\n            role="presentation"');
  });

  it("profile image has descriptive alt text", () => {
    expect(homeSource).toContain("alt=\"Abduallah Mohamed, PhD");
  });

  it("CTA buttons have accessible labels", () => {
    expect(homeSource).toContain('aria-label="Send email to Abduallah Mohamed"');
    expect(homeSource).toContain('aria-label="Download resume PDF (opens in new tab)"');
  });

  it("scroll indicator is aria-hidden", () => {
    expect(homeSource).toContain('aria-hidden="true"\n          >');
  });

  it("sections have aria-labelledby", () => {
    expect(homeSource).toContain('aria-labelledby="expertise-heading"');
    expect(homeSource).toContain('aria-labelledby="experience-heading"');
    expect(homeSource).toContain('aria-labelledby="publications-heading"');
    expect(homeSource).toContain('aria-labelledby="contact-heading"');
  });

  it("section headings have matching ids", () => {
    expect(homeSource).toContain('id="expertise-heading"');
    expect(homeSource).toContain('id="experience-heading"');
    expect(homeSource).toContain('id="publications-heading"');
    expect(homeSource).toContain('id="contact-heading"');
  });

  it("contact links have aria-labels", () => {
    expect(homeSource).toContain('aria-label="Email: abduallah.adel.omar@gmail.com"');
    expect(homeSource).toContain('aria-label="Phone: 512-924-1587"');
  });

  it("publication external links have aria-labels", () => {
    expect(homeSource).toContain("aria-label={`Open paper: ${pub.title} (opens in new tab)`}");
  });

  it("patent link has aria-label", () => {
    expect(homeSource).toContain('aria-label="View patent DE102017101476B3');
  });

  it("social contact links have aria-labels", () => {
    expect(homeSource).toContain("aria-label={`${link.label}: ${link.sub} (opens in new tab)`}");
  });

  it("decorative icons have aria-hidden", () => {
    // Check that icons inside links have aria-hidden
    expect(homeSource).toContain('<Github size={16} aria-hidden="true"');
    expect(homeSource).toContain('<Linkedin size={16} aria-hidden="true"');
    expect(homeSource).toContain('<Mail size={14} aria-hidden="true"');
    expect(homeSource).toContain('<Phone size={14} aria-hidden="true"');
    expect(homeSource).toContain('<MapPin size={14} aria-hidden="true"');
  });
});

describe("Accessibility: index.css", () => {
  it("has focus-visible ring styles", () => {
    expect(indexCss).toContain("*:focus-visible");
    expect(indexCss).toContain("outline:");
  });

  it("has sr-only utility class", () => {
    expect(indexCss).toContain(".sr-only");
    expect(indexCss).toContain("clip: rect(0, 0, 0, 0)");
  });
});
