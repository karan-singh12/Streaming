import { getDB } from "../config/db.config";
import { sendEmail } from "../utils/functions";

export class AlertNotificationService {
  /**
   * Notify all active admins about a new alert
   */
  static async notifyAdmins(alert: any): Promise<void> {
    try {
      const db = getDB();
      // Get all active admins
      let adminsQuery = db("admins")
        .where("status", 1)
        .select("id", "email_address", "name");

      // Optionally filter by role if only superadmins should be notified for critical alerts
      // (Currently not filtering, but can add if needed)

      const admins = await adminsQuery;

      if (admins.length === 0) {
        console.log("No active admins to notify");
        return;
      }

      // Send email notifications
      const emailPromises = admins.map((admin: any) =>
        this.sendAlertEmail(admin, alert)
      );

      await Promise.allSettled(emailPromises);

      // Create alert_notifications records for each admin
      const notificationRecords = admins.map((admin: any) => ({
        alert_id: alert.id,
        admin_id: admin.id,
        delivery_status: "sent",
        sent_at: db.fn.now(),
      }));

      if (notificationRecords.length > 0) {
        await db("alert_notifications").insert(notificationRecords);
      }

      console.log(`Alert notifications sent to ${admins.length} admins`);
    } catch (error) {
      console.error("Error notifying admins:", error);
    }
  }

  /**
   * Send email notification to a single admin
   */
  private static async sendAlertEmail(admin: any, alert: any): Promise<void> {
    try {
      const severityEmoji = this.getSeverityEmoji(alert.severity);
      const severityColor = this.getSeverityColor(alert.severity);

      // Create email content
      const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${severityColor}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .footer { background-color: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; }
    .metric { background-color: white; padding: 10px; margin: 10px 0; border-left: 4px solid ${severityColor}; }
    .button { display: inline-block; padding: 10px 20px; background-color: ${severityColor}; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${severityEmoji} Security Alert: ${alert.title}</h1>
      <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
    </div>
    <div class="content">
      <h2>Alert Details</h2>
      <p><strong>Type:</strong> ${this.formatAlertType(alert.type)}</p>
      <p><strong>Message:</strong> ${alert.message}</p>
      
      ${
        alert.ip_address
          ? `<p><strong>IP Address:</strong> ${alert.ip_address}</p>`
          : ""
      }
      ${
        alert.affected_endpoint
          ? `<p><strong>Affected Endpoint:</strong> ${alert.affected_endpoint}</p>`
          : ""
      }
      
      ${alert.metrics ? this.formatMetrics(alert.metrics) : ""}
      
      <p><strong>Detected At:</strong> ${new Date(
        alert.created_at
      ).toLocaleString()}</p>
      
      <a href="${process.env.ADMIN_DASHBOARD_URL}/alerts/${
        alert.id
      }" class="button">View Alert in Dashboard</a>
    </div>
    <div class="footer">
      <p>streaming LIVE Security Monitoring System</p>
      <p style="font-size: 12px;">This is an automated security alert. Please review immediately.</p>
    </div>
  </div>
</body>
</html>
      `;

      // Check for custom email template
      const db = getDB();
      const template = await db("email_templates")
        .where("slug", "security-alert")
        .where("status", 1)
        .first();

      let subject = `[${alert.severity.toUpperCase()}] Security Alert: ${
        alert.title
      }`;
      let message = emailContent;

      if (template) {
        subject = template.subject || subject;
        message =
          template.content
            .replace("{adminName}", admin.name)
            .replace("{alertTitle}", alert.title)
            .replace("{alertSeverity}", alert.severity.toUpperCase())
            .replace("{alertMessage}", alert.message)
            .replace("{alertTime}", new Date(alert.created_at).toLocaleString())
            .replace(
              "{alertLink}",
              `${process.env.ADMIN_DASHBOARD_URL}/alerts/${alert.id}`
            ) || emailContent;
      }

      await sendEmail({
        email: admin.email_address,
        subject,
        message,
      });

      console.log(`Alert email sent to ${admin.email_address}`);
    } catch (error) {
      console.error(
        `Error sending alert email to ${admin.email_address}:`,
        error
      );
    }
  }

  /**
   * Send digest email with multiple alerts
   */
  static async sendAlertDigest(): Promise<void> {
    try {
      // Get all unacknowledged alerts from last 24 hours
      const db = getDB();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const alerts = await db("alerts")
        .where("status", 0) // 0 = new
        .where("created_at", ">=", oneDayAgo)
        .orderBy("severity", "desc")
        .orderBy("created_at", "desc");

      if (alerts.length === 0) {
        console.log("No new alerts for digest");
        return;
      }

      // Get all active admins
      const admins = await db("admins")
        .where("status", 1)
        .select("id", "email_address", "name");

      // Send digest to each admin
      for (const admin of admins) {
        await this.sendDigestEmail(admin, alerts);
      }

      console.log(`Alert digest sent to ${admins.length} admins`);
    } catch (error) {
      console.error("Error sending alert digest:", error);
    }
  }

  /**
   * Send digest email to a single admin
   */
  private static async sendDigestEmail(
    admin: any,
    alerts: any[]
  ): Promise<void> {
    try {
      const criticalCount = alerts.filter(
        (a) => a.severity === "critical"
      ).length;
      const highCount = alerts.filter((a) => a.severity === "high").length;
      const mediumCount = alerts.filter((a) => a.severity === "medium").length;
      const lowCount = alerts.filter((a) => a.severity === "low").length;

      const alertsList = alerts
        .map(
          (alert: any) => `
        <li style="margin: 10px 0; padding: 10px; background-color: white; border-left: 4px solid ${this.getSeverityColor(
          alert.severity
        )};">
          <strong>${this.getSeverityEmoji(alert.severity)} ${
            alert.title
          }</strong><br>
          <span style="color: #666; font-size: 14px;">${
            alert.message
          }</span><br>
          <span style="color: #999; font-size: 12px;">${new Date(
            alert.created_at
          ).toLocaleString()}</span>
        </li>
      `
        )
        .join("");

      const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .stats { display: flex; justify-content: space-around; margin: 20px 0; }
    .stat { text-align: center; padding: 15px; background-color: white; border-radius: 5px; flex: 1; margin: 0 5px; }
    .stat-number { font-size: 24px; font-weight: bold; }
    ul { list-style: none; padding: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Daily Security Alert Digest</h1>
      <p>Summary of security alerts from the last 24 hours</p>
    </div>
    <div class="content">
      <h2>Hello ${admin.name},</h2>
      <p>Here's your daily security summary for streaming LIVE:</p>
      
      <div class="stats">
        ${
          criticalCount > 0
            ? `<div class="stat"><div class="stat-number" style="color: #dc3545;">${criticalCount}</div><div>Critical</div></div>`
            : ""
        }
        ${
          highCount > 0
            ? `<div class="stat"><div class="stat-number" style="color: #fd7e14;">${highCount}</div><div>High</div></div>`
            : ""
        }
        ${
          mediumCount > 0
            ? `<div class="stat"><div class="stat-number" style="color: #ffc107;">${mediumCount}</div><div>Medium</div></div>`
            : ""
        }
        ${
          lowCount > 0
            ? `<div class="stat"><div class="stat-number" style="color: #28a745;">${lowCount}</div><div>Low</div></div>`
            : ""
        }
      </div>
      
      <h3>Recent Alerts:</h3>
      <ul>
        ${alertsList}
      </ul>
      
      <a href="${
        process.env.ADMIN_DASHBOARD_URL
      }/alerts" style="display: inline-block; padding: 10px 20px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">View All Alerts</a>
    </div>
    <div style="background-color: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 5px 5px;">
      <p>streaming LIVE Security Monitoring System</p>
    </div>
  </div>
</body>
</html>
      `;

      await sendEmail({
        email: admin.email_address,
        subject: `Security Alert Digest - ${alerts.length} New Alerts`,
        message: emailContent,
      });

      console.log(`Digest email sent to ${admin.email_address}`);
    } catch (error) {
      console.error(
        `Error sending digest email to ${admin.email_address}:`,
        error
      );
    }
  }

  /**
   * Get emoji for alert severity
   */
  private static getSeverityEmoji(severity: string): string {
    const emojis: { [key: string]: string } = {
      critical: "🚨",
      high: "⚠️",
      medium: "⚡",
      low: "ℹ️",
    };
    return emojis[severity] || "📢";
  }

  /**
   * Get color for alert severity
   */
  private static getSeverityColor(severity: string): string {
    const colors: { [key: string]: string } = {
      critical: "#dc3545",
      high: "#fd7e14",
      medium: "#ffc107",
      low: "#28a745",
    };
    return colors[severity] || "#6c757d";
  }

  /**
   * Format alert type for display
   */
  private static formatAlertType(type: string): string {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Format metrics for email display
   */
  private static formatMetrics(metrics: any): string {
    if (!metrics) return "";

    let html = '<div class="metric"><h3>Metrics:</h3><ul>';

    if (metrics.requestCount) {
      html += `<li><strong>Request Count:</strong> ${metrics.requestCount}</li>`;
    }
    if (metrics.timeWindow) {
      html += `<li><strong>Time Window:</strong> ${metrics.timeWindow} seconds</li>`;
    }
    if (metrics.threshold) {
      html += `<li><strong>Threshold:</strong> ${metrics.threshold}</li>`;
    }
    if (metrics.errorRate) {
      html += `<li><strong>Error Rate:</strong> ${metrics.errorRate}%</li>`;
    }
    if (metrics.suspiciousPatterns && metrics.suspiciousPatterns.length > 0) {
      html += `<li><strong>Suspicious Patterns:</strong><ul>`;
      metrics.suspiciousPatterns.forEach((pattern: string) => {
        html += `<li>${pattern}</li>`;
      });
      html += "</ul></li>";
    }

    html += "</ul></div>";
    return html;
  }

  /**
   * Notify specific admin about alert acknowledgment
   */
  static async notifyAlertAcknowledged(
    alertId: string,
    acknowledgedBy: string
  ): Promise<void> {
    try {
      const db = getDB();
      const alert = await db("alerts").where("id", alertId).first();
      const admin = await db("admins")
        .where("id", acknowledgedBy)
        .select("id", "name", "email_address")
        .first();

      if (!alert || !admin) return;

      // Notify other admins that this alert has been acknowledged
      const otherAdmins = await db("admins")
        .where("id", "!=", acknowledgedBy)
        .where("status", 1)
        .select("id", "email_address", "name");

      for (const otherAdmin of otherAdmins) {
        await sendEmail({
          email: otherAdmin.email_address,
          subject: `Alert Acknowledged: ${alert.title}`,
          message: `
            <p>Hello ${otherAdmin.name},</p>
            <p>The following alert has been acknowledged by ${admin.name}:</p>
            <p><strong>${alert.title}</strong></p>
            <p>${alert.message}</p>
            <p>Time: ${new Date().toLocaleString()}</p>
          `,
        });
      }
    } catch (error) {
      console.error("Error notifying alert acknowledgment:", error);
    }
  }
}

export default AlertNotificationService;
