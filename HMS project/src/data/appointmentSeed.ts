import type { AppointmentRecord } from "./dashboardStore";
export const appointmentSeed: AppointmentRecord[] = [
  {
    "id": "1",
    "appointmentId": "APT-1001",
    "patient": "Ahmed Khan",
    "doctor": "Dr. Ali Raza",
    "department": "Cardiology",
    "date": "2026-09-30",
    "time": "09:30 AM",
    "status": "Confirmed",
    "initials": "AK"
  },
  {
    "id": "2",
    "appointmentId": "APT-1002",
    "patient": "Sara Ahmed",
    "doctor": "Dr. Ayesha Malik",
    "department": "Neurology",
    "date": "2026-09-30",
    "time": "10:45 AM",
    "status": "Waiting",
    "initials": "SA"
  },
  {
    "id": "3",
    "appointmentId": "APT-1003",
    "patient": "Usman Tariq",
    "doctor": "Dr. Hamza Khan",
    "department": "Orthopedics",
    "date": "2026-09-30",
    "time": "12:15 PM",
    "status": "Confirmed",
    "initials": "UT"
  },
  {
    "id": "4",
    "appointmentId": "APT-1004",
    "patient": "Maryam Iqbal",
    "doctor": "Dr. Sana Ahmed",
    "department": "Ophthalmology",
    "date": "2026-09-30",
    "time": "02:00 PM",
    "status": "Completed",
    "initials": "MI"
  },
  {
    "id": "5",
    "appointmentId": "APT-1005",
    "patient": "Bilal Ahmed",
    "doctor": "Dr. Hassan Rauf",
    "department": "General Surgery",
    "date": "2026-10-01",
    "time": "11:00 AM",
    "status": "Cancelled",
    "initials": "BA"
  }
];
