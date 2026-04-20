package com.mediportal.controller;

import com.mediportal.dto.DoctorResponse;
import com.mediportal.repository.DoctorRatingRepository;
import com.mediportal.repository.DoctorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private DoctorRatingRepository ratingRepository;

    @GetMapping
    public ResponseEntity<List<DoctorResponse>> getAllDoctors(
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) String search) {

        var doctors = (search != null && !search.isEmpty())
                ? doctorRepository.findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(search, search)
                : (specialization != null && !specialization.isEmpty())
                    ? doctorRepository.findBySpecialization(specialization)
                    : doctorRepository.findAll();

        List<DoctorResponse> responses = doctors.stream().map(d -> {
            Double avgRating = ratingRepository.findAverageRatingByDoctorId(d.getId());
            long count = ratingRepository.countByDoctorId(d.getId());
            return DoctorResponse.fromDoctor(d, avgRating, count);
        }).collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DoctorResponse> getDoctorById(@PathVariable Long id) {
        return doctorRepository.findById(id)
                .map(d -> {
                    Double avgRating = ratingRepository.findAverageRatingByDoctorId(d.getId());
                    long count = ratingRepository.countByDoctorId(d.getId());
                    return ResponseEntity.ok(DoctorResponse.fromDoctor(d, avgRating, count));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}

