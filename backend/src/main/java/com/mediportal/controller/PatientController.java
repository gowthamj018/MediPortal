package com.mediportal.controller;

import com.mediportal.model.Patient;
import com.mediportal.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/patient")
public class PatientController {

    @Autowired
    private PatientRepository patientRepository;

    private Patient getCurrentPatient(Authentication auth) {
        return patientRepository.findByPhone(auth.getName()).orElseThrow();
    }

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(Authentication auth) {
        Patient patient = getCurrentPatient(auth);
        return ResponseEntity.ok(toMap(patient));
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @RequestBody Map<String, Object> updates, Authentication auth) {
        Patient patient = getCurrentPatient(auth);

        if (updates.containsKey("firstName")) patient.setFirstName((String) updates.get("firstName"));
        if (updates.containsKey("lastName")) patient.setLastName((String) updates.get("lastName"));
        if (updates.containsKey("phone")) patient.setPhone((String) updates.get("phone"));
        if (updates.containsKey("address")) patient.setAddress((String) updates.get("address"));
        if (updates.containsKey("gender")) patient.setGender((String) updates.get("gender"));
        if (updates.containsKey("bloodGroup")) patient.setBloodGroup((String) updates.get("bloodGroup"));
        if (updates.containsKey("weight")) {
            Object w = updates.get("weight");
            patient.setWeight(w != null ? Double.parseDouble(w.toString()) : null);
        }
        if (updates.containsKey("height")) {
            Object h = updates.get("height");
            patient.setHeight(h != null ? Double.parseDouble(h.toString()) : null);
        }
        if (updates.containsKey("age")) {
            Object a = updates.get("age");
            patient.setAge(a != null ? Integer.parseInt(a.toString()) : null);
        }

        patientRepository.save(patient);
        return ResponseEntity.ok(toMap(patient));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardStats(Authentication auth) {
        Patient patient = getCurrentPatient(auth);
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("patientId", patient.getId());
        stats.put("name", patient.getFirstName() + " " + patient.getLastName());
        stats.put("email", patient.getEmail());
        stats.put("memberSince", patient.getCreatedAt());
        stats.put("weight", patient.getWeight());
        stats.put("height", patient.getHeight());
        stats.put("age", patient.getAge());

        // Calculate BMI
        if (patient.getWeight() != null && patient.getHeight() != null && patient.getHeight() > 0) {
            double heightInM = patient.getHeight() / 100.0;
            double bmi = patient.getWeight() / (heightInM * heightInM);
            stats.put("bmi", Math.round(bmi * 10.0) / 10.0);

            String category;
            if (bmi < 18.5) category = "Underweight";
            else if (bmi < 25) category = "Normal";
            else if (bmi < 30) category = "Overweight";
            else category = "Obese";
            stats.put("bmiCategory", category);
        }

        return ResponseEntity.ok(stats);
    }

    private Map<String, Object> toMap(Patient p) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", p.getId());
        map.put("firstName", p.getFirstName());
        map.put("lastName", p.getLastName());
        map.put("email", p.getEmail());
        map.put("phone", p.getPhone());
        map.put("dateOfBirth", p.getDateOfBirth());
        map.put("gender", p.getGender());
        map.put("address", p.getAddress());
        map.put("bloodGroup", p.getBloodGroup());
        map.put("weight", p.getWeight());
        map.put("height", p.getHeight());
        map.put("age", p.getAge());
        map.put("createdAt", p.getCreatedAt());
        return map;
    }
}

