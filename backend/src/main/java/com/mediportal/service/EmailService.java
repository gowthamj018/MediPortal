package com.mediportal.service;

import com.mediportal.model.Appointment;
import com.mediportal.model.Doctor;
import com.mediportal.model.Patient;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy, EEEE");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("hh:mm a");

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.email.from:noreply@medivault.app}")
    private String fromAddress;

    // ─────────────────────────────────────────────────────────────
    // OTP email
    // ─────────────────────────────────────────────────────────────

    /**
     * Sends an HTML OTP email to the given address.
     * Throws IllegalStateException on failure so the caller can return 503.
     */
    public void sendOtp(String toEmail, String otp) {
        send(toEmail, "MediVault — Your One-Time Password", buildOtpHtml(otp));
    }

    // ─────────────────────────────────────────────────────────────
    // Appointment confirmation email (new booking)
    // ─────────────────────────────────────────────────────────────

    /**
     * Sends an appointment confirmation to the patient.
     * Silently skips if the patient has no email on file.
     */
    public void sendBookingConfirmation(Patient patient, Doctor doctor, Appointment appointment) {
        if (patient.getEmail() == null || patient.getEmail().isBlank()) {
            log.info("Skipping booking confirmation — patient {} has no email", patient.getId());
            return;
        }
        try {
            String subject = "✅ Appointment Confirmed — MediVault";
            String html = buildAppointmentHtml(
                    "Appointment Confirmed",
                    "#0d9488",
                    "✅",
                    "Your appointment has been successfully booked. Please find the details below.",
                    patient, doctor, appointment,
                    null, null   // no old date/time for new bookings
            );
            send(patient.getEmail(), subject, html);
            log.info("Booking confirmation sent to [{}]", patient.getEmail());
        } catch (Exception ex) {
            log.error("Failed to send booking confirmation to [{}]: {}", patient.getEmail(), ex.getMessage());
        }
    }

    /**
     * Sends a reschedule notification to the patient.
     * Silently skips if the patient has no email on file.
     */
    public void sendRescheduleConfirmation(Patient patient, Doctor doctor, Appointment appointment,
                                           LocalDate oldDate, LocalTime oldTime) {
        if (patient.getEmail() == null || patient.getEmail().isBlank()) {
            log.info("Skipping reschedule confirmation — patient {} has no email", patient.getId());
            return;
        }
        try {
            String subject = "🔄 Appointment Rescheduled — MediVault";
            String html = buildAppointmentHtml(
                    "Appointment Rescheduled",
                    "#0284c7",
                    "🔄",
                    "Your appointment has been rescheduled. Please review the updated details below.",
                    patient, doctor, appointment,
                    oldDate, oldTime
            );
            send(patient.getEmail(), subject, html);
            log.info("Reschedule confirmation sent to [{}]", patient.getEmail());
        } catch (Exception ex) {
            log.error("Failed to send reschedule confirmation to [{}]: {}", patient.getEmail(), ex.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Core send helper
    // ─────────────────────────────────────────────────────────────

    private void send(String toEmail, String subject, String html) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(msg, true, "UTF-8");
            h.setFrom(fromAddress);
            h.setTo(toEmail);
            h.setSubject(subject);
            h.setText(html, true);
            mailSender.send(msg);
        } catch (MessagingException ex) {
            log.error("Failed to send email to [{}] — subject: {}: {}", toEmail, subject, ex.getMessage());
            throw new IllegalStateException("Could not deliver email. Please try again.");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // HTML builders
    // ─────────────────────────────────────────────────────────────

    private String buildAppointmentHtml(String title, String accentColor, String icon,
                                        String intro,
                                        Patient patient, Doctor doctor, Appointment appt,
                                        LocalDate oldDate, LocalTime oldTime) {

        String patientName = patient.getFirstName() + " " + patient.getLastName();
        String doctorName  = "Dr. " + doctor.getFirstName() + " " + doctor.getLastName();
        String newDate     = appt.getAppointmentDate().format(DATE_FMT);
        String newTime     = appt.getAppointmentTime().format(TIME_FMT);
        String fee         = "₹" + String.format("%.0f", doctor.getConsultationFee());
        String apptId      = "#" + appt.getId();
        String meetLink    = appt.getMeetLink();

        // Build "changed from" row only for reschedules
        String changedFromRow = "";
        if (oldDate != null && oldTime != null) {
            changedFromRow = row("Previous Date & Time",
                    "<s style='color:#94a3b8;'>" + oldDate.format(DATE_FMT)
                    + " at " + oldTime.format(TIME_FMT) + "</s>");
        }

        String reasonRow = (appt.getReason() != null && !appt.getReason().isBlank())
                ? row("Reason", appt.getReason()) : "";
        String notesRow  = (appt.getNotes() != null && !appt.getNotes().isBlank())
                ? row("Notes", appt.getNotes()) : "";

        return """
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:0;
                        border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;background:#fff;">

              <!-- Header -->
              <div style="background:%s;padding:28px 32px;text-align:center;">
                <div style="font-size:36px;margin-bottom:8px;">%s</div>
                <h2 style="margin:0;color:#fff;font-size:20px;font-weight:700;">%s</h2>
                <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">MediVault Patient Portal</p>
              </div>

              <!-- Body -->
              <div style="padding:28px 32px;">
                <p style="color:#334155;font-size:15px;margin:0 0 20px;">
                  Hi <strong>%s</strong>,<br><br>%s
                </p>

                <!-- Details table -->
                <table style="width:100%%;border-collapse:collapse;font-size:14px;">
                  %s
                  %s
                  %s
                  %s
                  %s
                  %s
                  %s
                  %s
                </table>

                <!-- Action tip -->
                <div style="margin-top:24px;padding:14px 18px;background:#f0fdfa;
                            border-left:4px solid %s;border-radius:6px;">
                  <p style="margin:0;color:#0d9488;font-size:13px;">
                    💡 You can view or manage your appointment in the
                    <strong>MediVault Patient Portal</strong> under <em>My Appointments</em>.
                  </p>
                </div>

                <!-- Google Meet button (Video Call only) -->
                %s
              </div>

              <!-- Footer -->
              <div style="background:#f8fafc;padding:18px 32px;border-top:1px solid #e2e8f0;
                          text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:12px;">
                  © MediVault Patient Portal &nbsp;|&nbsp;
                  This is an automated email — please do not reply.
                </p>
              </div>
            </div>
            """.formatted(
                accentColor, icon, title,
                patientName, intro,
                changedFromRow,
                row("Appointment ID", apptId),
                row("Doctor",         doctorName),
                row("Specialization", doctor.getSpecialization()),
                row("Date",           newDate),
                row("Time",           newTime),
                row("Type",           appt.getAppointmentType()),
                reasonRow + row("Consultation Fee", fee) + notesRow,
                accentColor,
                buildMeetButton(meetLink)
        );
    }

    /** Renders a single detail row in the appointment table. */
    private String row(String label, String value) {
        if (value == null || value.isBlank()) return "";
        return """
            <tr>
              <td style="padding:8px 0;color:#64748b;font-weight:600;
                         width:42%%;vertical-align:top;border-bottom:1px solid #f1f5f9;">%s</td>
              <td style="padding:8px 0;color:#1e293b;
                         vertical-align:top;border-bottom:1px solid #f1f5f9;">%s</td>
            </tr>
            """.formatted(label, value);
    }

    /** Renders a "Join Video Call" button block, or returns "" if no link provided. */
    private String buildMeetButton(String meetLink) {
        if (meetLink == null || meetLink.isBlank()) return "";
        return """
            <div style="margin-top:20px;text-align:center;">
              <p style="margin:0 0 12px;color:#334155;font-size:14px;font-weight:600;">
                📹 Your appointment is a <strong>Video Call</strong>
              </p>
              <a href="%s"
                 style="display:inline-block;background:#1a73e8;color:#fff;
                        font-size:15px;font-weight:700;padding:14px 32px;
                        border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
                🎥 Join Video Call
              </a>
              <p style="margin:10px 0 0;color:#94a3b8;font-size:11px;">
                %s
              </p>
            </div>
            """.formatted(meetLink, meetLink);
    }


    private String buildOtpHtml(String otp) {
        return """
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:36px;
                        border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">

              <div style="text-align:center;margin-bottom:24px;">
                <span style="font-size:22px;font-weight:700;color:#0d9488;">❤ MediVault</span>
              </div>

              <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">
                Hi there,<br>
                Use the one-time password below to complete your verification.
                It is valid for <strong>5 minutes</strong> and can only be used once.
              </p>

              <div style="text-align:center;margin:28px 0;">
                <span style="display:inline-block;font-size:40px;font-weight:800;
                             letter-spacing:14px;color:#0d9488;
                             background:#f0fdfa;padding:18px 32px;
                             border-radius:10px;border:2px solid #99f6e4;">
                  %s
                </span>
              </div>

              <p style="color:#64748b;font-size:13px;margin:0 0 8px;">
                🔒 Do <strong>not</strong> share this OTP with anyone — MediVault will never ask for it.
              </p>
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                If you did not request this, you can safely ignore this email.
              </p>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px;">
              <p style="color:#cbd5e1;font-size:11px;text-align:center;margin:0;">
                © MediVault Patient Portal
              </p>
            </div>
            """.formatted(otp);
    }
}
