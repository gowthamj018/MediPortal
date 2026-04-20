package com.mediportal.dto;

import com.mediportal.model.Doctor;
import lombok.Data;

@Data
public class DoctorResponse {
    private Long id;
    private String firstName;
    private String lastName;
    private String fullName;
    private String specialization;
    private String department;
    private String email;
    private String phone;
    private String qualification;
    private Integer experienceYears;
    private String bio;
    private String profilePicture;
    private String availableDays;
    private String availableFrom;
    private String availableTo;
    private Double rating;       // null if no ratings yet
    private Long ratingCount;    // number of ratings
    private Double consultationFee;

    public static DoctorResponse fromDoctor(Doctor d) {
        return fromDoctor(d, null, 0L);
    }

    public static DoctorResponse fromDoctor(Doctor d, Double avgRating, Long ratingCount) {
        DoctorResponse dto = new DoctorResponse();
        dto.setId(d.getId());
        dto.setFirstName(d.getFirstName());
        dto.setLastName(d.getLastName());
        dto.setFullName("Dr. " + d.getFirstName() + " " + d.getLastName());
        dto.setSpecialization(d.getSpecialization());
        dto.setDepartment(d.getDepartment());
        dto.setEmail(d.getEmail());
        dto.setPhone(d.getPhone());
        dto.setQualification(d.getQualification());
        dto.setExperienceYears(d.getExperienceYears());
        dto.setBio(d.getBio());
        dto.setProfilePicture(d.getProfilePicture());
        dto.setAvailableDays(d.getAvailableDays());
        dto.setAvailableFrom(d.getAvailableFrom());
        dto.setAvailableTo(d.getAvailableTo());
        dto.setConsultationFee(d.getConsultationFee());
        // Rating is null if no one has rated yet
        if (ratingCount > 0 && avgRating != null) {
            dto.setRating(Math.round(avgRating * 10.0) / 10.0);
            dto.setRatingCount(ratingCount);
        } else {
            dto.setRating(null);
            dto.setRatingCount(0L);
        }
        return dto;
    }
}

