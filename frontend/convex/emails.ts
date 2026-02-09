import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Send an alert email using Resend
 * This is an internal action called by the alert system
 */
export const sendAlertEmail = internalAction({
  args: {
    to: v.array(v.string()),
    restaurantName: v.string(),
    metric: v.string(),
    value: v.number(),
    threshold: v.number(),
    severity: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error("RESEND_API_KEY not configured");
      return { success: false, error: "Email service not configured" };
    }

    const metricLabels: Record<string, string> = {
      labourCostPercent: "Labour Cost %",
      foodCostPercent: "Food Cost %",
      revenue: "Revenue",
      orders: "Orders",
    };

    const metricLabel = metricLabels[args.metric] || args.metric;
    const severityEmoji = args.severity === "critical" ? "🚨" : "⚠️";

    const subject = `${severityEmoji} ${args.restaurantName}: ${metricLabel} Alert`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: ${args.severity === 'critical' ? '#dc2626' : '#f59e0b'};
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .metric-card {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid ${args.severity === 'critical' ? '#dc2626' : '#f59e0b'};
            }
            .metric-label {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 5px;
            }
            .metric-value {
              font-size: 32px;
              font-weight: bold;
              color: ${args.severity === 'critical' ? '#dc2626' : '#f59e0b'};
            }
            .threshold {
              font-size: 14px;
              color: #6b7280;
              margin-top: 10px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
              text-align: center;
            }
            .button {
              display: inline-block;
              background: #2563eb;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">
              ${severityEmoji} KPI Alert
            </h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">
              ${args.restaurantName}
            </p>
          </div>

          <div class="content">
            <p style="margin-top: 0;">
              A KPI has exceeded its threshold and requires your attention.
            </p>

            <div class="metric-card">
              <div class="metric-label">${metricLabel}</div>
              <div class="metric-value">
                ${args.metric.includes('Percent') ? args.value.toFixed(1) + '%' : args.value.toLocaleString()}
              </div>
              <div class="threshold">
                Threshold: ${args.threshold}${args.metric.includes('Percent') ? '%' : ''}
              </div>
            </div>

            <p><strong>Message:</strong> ${args.message}</p>

            <p style="margin-bottom: 0;">
              Please review your dashboard and take appropriate action.
            </p>

            <center>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/alerts" class="button">
                View Dashboard
              </a>
            </center>
          </div>

          <div class="footer">
            <p>
              You're receiving this because you're subscribed to alerts for ${args.restaurantName}.
            </p>
            <p>
              KPI Dashboard • Automated Alert System
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: "KPI Alerts <alerts@resend.dev>", // Update with your verified domain
          to: args.to,
          subject,
          html: htmlBody,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Resend API error:", error);
        return { success: false, error: error };
      }

      const data = await response.json();
      return { success: true, emailId: data.id };
    } catch (error) {
      console.error("Failed to send email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});
