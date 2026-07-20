interface TemplateVars {
  contractNumber: string;
  clientName: string;
  clientCompany: string;
  amountToman: string;
  startDate: string;
  durationLabel: string;
  scope: string;
}

export function renderContractTemplate(locale: string, vars: TemplateVars): string {
  return locale === "fa" ? templateFa(vars) : templateEn(vars);
}

function templateFa(v: TemplateVars): string {
  return `# قرارداد مشاوره هوش مصنوعی — شماره ${v.contractNumber}

## ماده ۱ — طرفین قرارداد
این قرارداد میان **سینیک (Syniq)**، به نمایندگی نازنین پناهی («مشاور»)، و **${v.clientName}**${v.clientCompany ? ` از شرکت **${v.clientCompany}**` : ""} («کارفرما») منعقد می‌گردد.

## ماده ۲ — موضوع قرارداد
ارائه خدمات مشاوره هوش مصنوعی بر پایه متدولوژی «چهار رکن» سینیک: مشاوره، طراحی، اجرا و بهینه‌سازی. موضوع مشخص همکاری:
${v.scope}

## ماده ۳ — مدت قرارداد
مدت اجرای این قرارداد **${v.durationLabel}** از تاریخ **${v.startDate}** خواهد بود.

## ماده ۴ — مبلغ و نحوه پرداخت
مبلغ کل قرارداد **${v.amountToman} تومان** است که به‌صورت مرحله‌ای پرداخت می‌شود:
- ۴۰٪ در زمان امضای قرارداد (شروع کار)
- ۳۰٪ پس از تحویل طرح اولیه (مرحله طراحی)
- ۳۰٪ پس از تحویل نهایی و تأیید کارفرما

## ماده ۵ — تعهدات مشاور
- ارائه خدمات مطابق استانداردهای حرفه‌ای و در چارچوب زمان‌بندی توافق‌شده
- گزارش‌دهی منظم از پیشرفت کار به کارفرما
- رعایت اصول محرمانگی نسبت به اطلاعات کارفرما

## ماده ۶ — تعهدات کارفرما
- فراهم‌کردن دسترسی و اطلاعات لازم برای انجام کار در زمان مقرر
- پرداخت به‌موقع مبالغ طبق جدول ماده ۴
- اعلام نظر و بازخورد در بازه‌های زمانی توافق‌شده

## ماده ۷ — محرمانگی
طرفین متعهد می‌شوند اطلاعات محرمانه‌ای که در جریان همکاری در اختیار یکدیگر قرار می‌دهند را افشا نکنند، مگر با رضایت کتبی طرف مقابل.

## ماده ۸ — مالکیت نتایج
نتایج و خروجی‌های نهایی این پروژه، پس از تسویه کامل مبلغ قرارداد، متعلق به کارفرما خواهد بود.

## ماده ۹ — فسخ قرارداد
هر یک از طرفین می‌تواند با اعلام کتبی ۱۵ روزه، این قرارداد را فسخ کند. در این صورت، هزینه خدمات ارائه‌شده تا تاریخ فسخ محاسبه و تسویه می‌شود.

## ماده ۱۰ — حل اختلاف
در صورت بروز اختلاف، طرفین ابتدا از طریق مذاکره مستقیم تلاش می‌کنند به توافق برسند؛ در غیر این صورت موضوع به مراجع صالح ارجاع خواهد شد.
`;
}

function templateEn(v: TemplateVars): string {
  return `# AI Consulting Agreement — No. ${v.contractNumber}

## Article 1 — Parties
This agreement is entered into between **Syniq**, represented by Nazanin Panahi ("Consultant"), and **${v.clientName}**${v.clientCompany ? ` of **${v.clientCompany}**` : ""} ("Client").

## Article 2 — Subject
Provision of AI consulting services following Syniq's "Four Pillars" methodology: Consult, Design, Build, Optimize. Specific scope of this engagement:
${v.scope}

## Article 3 — Term
This agreement runs for **${v.durationLabel}** starting **${v.startDate}**.

## Article 4 — Fees and Payment
Total contract value: **${v.amountToman} Toman**, paid in three installments:
- 40% upon signing (project start)
- 30% upon delivery of the initial design
- 30% upon final delivery and client approval

## Article 5 — Consultant Obligations
- Deliver services to a professional standard within the agreed timeline
- Provide regular progress reporting to the Client
- Maintain confidentiality of Client information

## Article 6 — Client Obligations
- Provide timely access and information required for the work
- Make payments on schedule per Article 4
- Provide feedback within agreed timeframes

## Article 7 — Confidentiality
Both parties agree not to disclose confidential information shared during the engagement without the other party's written consent.

## Article 8 — Ownership of Deliverables
Final project deliverables become the Client's property upon full payment.

## Article 9 — Termination
Either party may terminate this agreement with 15 days' written notice. Fees for work performed up to the termination date will be calculated and settled.

## Article 10 — Dispute Resolution
Disputes will first be addressed through direct negotiation; unresolved disputes will be referred to the competent authorities.
`;
}
