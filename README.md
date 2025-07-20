# Student Group Manager & CR Toolkit

 <!-- Optional: Add a screenshot URL here -->

A comprehensive, browser-based tool designed to help Class Representatives (CRs), teachers, and project leaders manage student data, groups, attendance, and deadlines with ease. This is a single-file, zero-dependency web application that runs entirely in your browser, keeping all your data private on your local machine.

## Table of Contents

- [Key Features](#key-features)
- [Live Demo](#live-demo)
- [How to Use](#how-to-use)
- [Feature Details](#feature-details)
  - [Student Management](#student-management)
  - [Group Management](#group-management)
  - [Attendance Tracker](#attendance-tracker)
  - [Deadline Tracker](#deadline-tracker)
- [Data & Privacy](#data--privacy)
- [Technical Details](#technical-details)
- [Future Enhancements](#future-enhancements)

## Key Features

- **All-in-One Dashboard**: Manage students, groups, attendance, and deadlines from a single, intuitive interface.
- **Zero Backend Required**: Runs entirely on the client-side (your browser). No need for servers, databases, or an internet connection after the initial page load.
- **Persistent Local Storage**: Your data is automatically saved to your browser's local storage, so it's always there when you return.
- **Data Portability**: Full backup and restore functionality allows you to save your entire dataset to a JSON file and import it on any other machine.
- **Student Management**:
  - Add students individually or in bulk (by pasting JSON).
  - Edit student details.
  - Delete students.
- **Group Management**:
  - Create and name groups.
  - Assign students to groups.
  - View group members in an organized, collapsible layout.
- **Attendance Tracker**:
  - Take daily attendance for any group.
  - View a clear summary of present and absent students.
  - Edit a saved attendance record for the day.
- **Deadline Tracker**:
  - Add, edit, and delete events or deadlines.
  - Automatically sorts events into "Upcoming" and "Past" sections.
  - Provides visual cues for deadlines that are near or overdue.

## Live Demo

[Link to your live demo] <!-- TODO: If you host this on GitHub Pages, Vercel, or Netlify, put the link here -->

## How to Use

1.  **Download the Code**:
    - Clone the repository:
      ```bash
      git clone https://github.com/your-username/your-repository-name.git
      ```
    - Or, simply download the `index.html` file from the repository.

2.  **Open the File**:
    - Navigate to the downloaded folder and open the `index.html` file in any modern web browser (like Chrome, Firefox, or Edge).

3.  **Start Managing**:
    - The application is ready to use immediately! It comes with some sample data to help you get started.
    - Begin by adding your students in the "Students" tab, creating groups in the "Groups" tab, and then using the "Attendance" and "Deadlines" tabs for your daily tasks.

## Feature Details

### Student Management

- **Add Student**: Use the "Add" button to open a modal and enter a student's roll number and name.
- **Bulk Add**: Use the "Bulk Add" button to paste a JSON array of student objects. The expected format is:
  ```json
  [
    { "roll": "101", "name": "Alice Johnson" },
    { "roll": "102", "name": "Bob Williams" }
  ]
  ```
- **Edit/Delete**: Use the controls on each student item to manage their records.

### Group Management

- Create groups from the "Groups" tab.
- To assign students, go to the "Students" tab, select the students you want to group by clicking on them, choose a destination group from the "Assignment" dropdown, and click "Assign to Group".

### Attendance Tracker

- Navigate to the "Attendance" tab.
- Select a group from the dropdown. A list of members will appear, defaulted to "Absent".
- Mark the present students and click "Save Today's Attendance".
- A summary will be displayed. You can use the "Edit" button to make corrections or "Take Again" to restart.

### Deadline Tracker

- Navigate to the "Deadlines" tab.
- Fill out the form to add a new event, including its name, submission date, and optional notes.
- Your events will automatically appear in the "Upcoming" or "Past & Completed" lists, sorted by date.
- Use the "Edit" and "Delete" buttons on each event card to manage your deadlines.

## Data & Privacy

All the data you enter into this application is stored exclusively in your browser's **Local Storage**. It is **never** sent to any external server or cloud service. This ensures your student and class data remains completely private and under your control.

- **Backup**: Use the **"Backup All"** button in the "Students" tab to download a single `.json` file containing all your students, groups, attendance, and deadline data. Keep this file safe!
- **Restore**: Use the **"Restore"** button to upload a previously saved `.json` backup file. This will overwrite all existing data in the application, making it perfect for moving your setup to a new computer or recovering from a browser data clear.

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Modern CSS with variables for easy theming. No CSS frameworks are used.
- **Dependencies**: None! The project is self-contained in a single `index.html` file. Font Awesome is used for icons, loaded via a CDN.
- **State Management**: All application state is managed within JavaScript objects and synchronized with the browser's Local Storage API for persistence.

## Future Enhancements

This project has a solid foundation and can be extended with more features useful for a Class Representative:

- **Announcements Hub**: A dedicated tab to generate and copy pre-formatted announcements for WhatsApp or email.
- **Contribution Tracker**: A tool to track fee collections or contributions for class events.
- **Advanced Reporting**: Generate and export attendance reports for a specific date range (e.g., weekly or monthly).
- **Drag-and-Drop Interface**: Allow dragging students from the list and dropping them into groups.

Contributions and suggestions are welcome!
