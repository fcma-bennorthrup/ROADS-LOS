import logo from "@assets/r1-icon-color_1794259898751.png";

export function PipelineFooter() {
  return <footer className="pipeline-footer">
    <div className="pipeline-footer-brand headline-100"><img src={logo} alt="" /><span>RURAL 1<sup>st</sup></span></div>
    <p className="body-200">All loans are subject to credit approval and eligibility. Rural 1st is an equal housing lender.</p>
    <p className="body-200">©{new Date().getFullYear()} Rural 1st All rights reserved.</p>
    <div className="pipeline-footer-lender caption-100" aria-label="Equal Housing Lender">
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M4 16 20 5l16 11M9 14v20h22V14M15 19h10M15 25h10" /></svg>
      <span>EQUAL HOUSING<br />LENDER</span>
    </div>
  </footer>;
}
