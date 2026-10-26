
import { useEffect, useState } from "react";
import axios from "axios";
import "./index.css";

const API_URL = "https://id-entix-backend.onrender.com/api";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [batchMessage, setBatchMessage] = useState("");

  const [institution, setInstitution] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("identixInstitution")
      ) || null;
    } catch {
      return null;
    }
  });

  const [students, setStudents] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({
    studentName: "",
    rollNumber: "",
    apaarId: "",
    course: "",
    academicYear: "",
  });
  

const downloadCSVTemplate = () => {
  const csv =
    "studentName,rollNumber,apaarId,course,academicYear\n" +
    "Example Student,ROLL001,123456789012,BTech,2026";

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "identix_student_template.csv";
  link.click();
  URL.revokeObjectURL(url);
};
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Dashboard");

  const token = localStorage.getItem("identixToken");

  // Fetch students from backend
  const fetchStudents = async () => {
    const currentToken = localStorage.getItem("identixToken");

    const savedInstitution = JSON.parse(
      localStorage.getItem("identixInstitution") || "null"
    );

    if (!currentToken || !savedInstitution?._id) return;

    setLoadingStudents(true);
    setMessage("");

    try {
      const response = await axios.get(
        `${API_URL}/students/institution/${savedInstitution._id}`,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      setStudents(response.data.students || []);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Could not load student records."
      );
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (institution) {
      fetchStudents();
    }
  }, [institution?._id]);

  // Institution login
  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(
        `${API_URL}/institutions/login`,
        { email, password }
      );

      localStorage.setItem(
        "identixToken",
        response.data.token
      );

      localStorage.setItem(
        "identixInstitution",
        JSON.stringify(response.data.institution)
      );

      setInstitution(response.data.institution);
      setPassword("");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Login failed. Check your credentials and backend."
      );
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("identixToken");
    localStorage.removeItem("identixInstitution");

    setInstitution(null);
    setStudents([]);
    setEmail("");
    setPassword("");
    setSearch("");
    setActiveTab("Dashboard");
    setMessage("");
  };


const updateStudentStatus = async (studentId, status) => {
  const currentToken = localStorage.getItem("identixToken");

  try {
    setMessage("");

    await axios.patch(
      `${API_URL}/students/${studentId}/status`,
      { verificationStatus: status },
      {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      }
    );

    await fetchStudents();
    setMessage(`Student status updated to ${status}.`);
  } catch (error) {
    setMessage(
      error.response?.data?.message ||
        "Could not update student verification status."
    );
  }
};

 
const [uploadingCSV, setUploadingCSV] = useState(false);

const handleCSVUpload = async (event) => {
  const file = event.target.files[0];

  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".csv")) {
    setMessage("Please select a CSV file.");
    event.target.value = "";
    return;
  }

  const currentToken = localStorage.getItem("identixToken");

  const formData = new FormData();
  formData.append("file", file);

  setUploadingCSV(true);
  setMessage("");

  try {
    const response = await axios.post(
      `${API_URL}/students/import-csv`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      }
    );

    setMessage(
      response.data.message || "CSV import completed successfully."
    );

    await fetchStudents();
  } catch (error) {
    setMessage(
      error.response?.data?.message ||
        "CSV upload failed. Please check the file and try again."
    );
  } finally {
    setUploadingCSV(false);
    event.target.value = "";
  }
};


  // Search students
  const filteredStudents = students.filter((student) =>
    [
      student.studentName,
      student.rollNumber,
      student.apaarId,
      student.course,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );


  const verificationStudents = filteredStudents.filter(
    (student) =>
    !student.verificationStatus ||
    student.verificationStatus === "pending" ||
    student.verificationStatus === "correction_required"
  );


  const verified = students.filter(
    (student) => student.verificationStatus === "verified"
  ).length;

  const pending = students.filter(
    (student) =>
      !student.verificationStatus ||
      student.verificationStatus === "pending"
  ).length;

  const rejected = students.filter(
    (student) => student.verificationStatus === "rejected"
  ).length;

  const correctionRequired = students.filter(
  (student) =>
    student.verificationStatus === "correction_required"
).length;


const saveStudentEdit = async () => {
  if (!editingStudent) return;

  try {
    const token = localStorage.getItem("identixToken");

    await axios.patch(
      `${API_URL}/students/${editingStudent._id}`,
      editForm,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setEditingStudent(null);
    await fetchStudents();
  } catch (error) {
    console.error("Unable to update student:", error);
    alert(
      error.response?.data?.message ||
      "Failed to update student details."
    );
  }
};


const submitBatch = async () => {
  if (selectedStudentIds.length === 0) {
    setBatchMessage("Please select at least one pending student.");
    return;
  }

  try {
    setSubmittingBatch(true);
    setBatchMessage("");

    const token = localStorage.getItem("identixToken");

    const response = await fetch(
      "https://id-entix-backend.onrender.com/api/batches/submit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentIds: selectedStudentIds,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Batch submission failed");
    }

    setBatchMessage(
      `Batch submitted! Reference: ${data.batch.batchReference}`
    );
    setSelectedStudentIds([]);
  } catch (error) {
    setBatchMessage(error.message);
  } finally {
    setSubmittingBatch(false);
  }
};


  // Student records table
  const renderStudentTable = () => (
    <>
      <div className="records-toolbar">
        <div>
          <h2>
            {activeTab === "Verification"
              ? "Student Verification"
              : "Student Records"}
          </h2>
          <p>
            {activeTab === "Verification"
              ? "Review the current verification status of students."
              : "Manage and search student identity records."}
          </p>
        </div>

        <input
          className="search-input"
          type="search"
          placeholder="Search name, roll no. or APAAR ID..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        
{activeTab === "Student Records" && (
  <>
    <button
      type="button"
      onClick={downloadCSVTemplate}
      className="template-download-button"
    >
      Download CSV Template
    </button>

    <label className="csv-upload-button">
      {uploadingCSV ? "Uploading CSV..." : "↑ Upload CSV"}
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={handleCSVUpload}
        disabled={uploadingCSV}
        hidden
      />
    </label>
  </>
)}


      </div>


{activeTab === "Student Records" && (
  <div className="batch-controls">
    <button
      type="button"
      onClick={() => {
        const pendingIds = filteredStudents
          .filter(
            (student) =>
              (student.verificationStatus || "pending") === "pending"
          )
          .map((student) => student._id);

        setSelectedStudentIds(pendingIds);
      }}
    >
      Select All Pending
    </button>

    <button
      type="button"
      onClick={submitBatch}
      disabled={submittingBatch || selectedStudentIds.length === 0}
    >
      {submittingBatch ? "Submitting..." : `Submit Batch (${selectedStudentIds.length})`}
    </button>

    {batchMessage && <p>{batchMessage}</p>}
  </div>
)}


      {loadingStudents ? (
        <p className="empty-state">Loading student records...</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Student Name</th>
                <th>Roll Number</th>
                <th>APAAR ID</th>
                <th>Course</th>
                <th>Session</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.length > 0 ? (
              (activeTab === "Verification"
                ? verificationStudents
                : filteredStudents
              ).map((student) => {
                  const status =
                    student.verificationStatus || "pending";

                  return (
                    <tr key={student._id}>
                      <td>
                        <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student._id)}
                         disabled={status !== "pending"}
                         onChange={(e) => {
                           setSelectedStudentIds((prev) =>
                             e.target.checked
                               ? [...prev, student._id]
                               : prev.filter((id) => id !== student._id)
                            );
                          }}
                       />
                      </td>
                      <td>
                        <strong>{student.studentName || "—"}</strong>
                      </td>
                      <td>{student.rollNumber || "—"}</td>
                      <td>{student.apaarId || "—"}</td>
                      <td>{student.course || "—"}</td>
                      <td>{student.academicYear || student.academicSession || "—"}</td>
                      
                      <td>
                        <span className={`status ${status}`}>
                           {status.replace("_", " ")}
                        </span>
                      </td>

<td>

<button
  type="button"
  onClick={() => {
    setEditingStudent(student);
    setEditForm({
      studentName: student.studentName || "",
      rollNumber: student.rollNumber || "",
      apaarId: student.apaarId || "",
      course: student.course || "",
      academicYear: student.academicYear || "",
    });
  }}
>
  Edit
</button>

  <button
    type="button"
    onClick={() =>
      updateStudentStatus(student._id, "verified")
    }
    disabled={status === "verified"}
  >
    Verify
  </button>

  <button
    type="button"
    onClick={() =>
      updateStudentStatus(student._id, "rejected")
    }
    disabled={status === "rejected"}
  >
    Reject
  </button>

<button
  type="button"
  onClick={() =>
    updateStudentStatus(student._id, "correction_required")
  }
  disabled={status === "correction_required"}
>
  Correction Required
</button>

</td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="empty-state">
                    No student records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      
      )}

      {editingStudent && (
        <div className="edit-form">
          <h2>Edit Student Details</h2>

          <input
            placeholder="Student Name"
            value={editForm.studentName}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                studentName: e.target.value,
              })
            }
          />

          <input
            placeholder="Roll Number"
            value={editForm.rollNumber}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                rollNumber: e.target.value,
              })
            }
          />

          <input
            placeholder="APAAR ID"
            value={editForm.apaarId}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                apaarId: e.target.value,
              })
            }
          />

          <input
            placeholder="Course"
            value={editForm.course}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                course: e.target.value,
              })
            }
          />

          <input
            placeholder="Academic Year"
            value={editForm.academicYear}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                academicYear: e.target.value,
              })
            }
          />

          <button type="button" onClick={saveStudentEdit}>
            Save Changes
          </button>

          <button
            type="button"
            onClick={() => setEditingStudent(null)}
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );

  // Login screen
  if (!institution) {
    return (
      <div className="app">
        <div className="login-card">
          <div className="logo">I</div>

          <h1>Identix</h1>
          <p className="subtitle">
            Student Identity Verification Platform
          </p>

          <h2>Welcome Back</h2>
          <p className="description">
            Sign in to manage student records and verification.
          </p>

          <form onSubmit={handleLogin}>
            <label htmlFor="email">Institution Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your institution email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {message && (
            <p className="error-message">{message}</p>
          )}

          <p className="footer">
            Secure Institution Access · Identix SIH Project
          </p>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">I</div>
          <h2>Identix</h2>
        </div>

        <p className="nav-heading">MAIN MENU</p>

        <button
          className={`nav-item ${
            activeTab === "Dashboard" ? "active" : ""
          }`}
          onClick={() => setActiveTab("Dashboard")}
        >
          ▦ &nbsp; Dashboard
        </button>

        <button
          className={`nav-item ${
            activeTab === "Student Records" ? "active" : ""
          }`}
          onClick={() => setActiveTab("Student Records")}
        >
          ♙ &nbsp; Student Records
        </button>

        <button
          className={`nav-item ${
            activeTab === "Verification" ? "active" : ""
          }`}
          onClick={() => setActiveTab("Verification")}
        >
          ✓ &nbsp; Verification
        </button>

        <div className="sidebar-bottom">
          <p className="institution-label">SIGNED IN AS</p>
          <strong>{institution.name}</strong>
          <small>{institution.institutionCode}</small>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">INSTITUTION PORTAL</p>
            <h1>{activeTab}</h1>
          </div>

          <button
            className="refresh-button"
            onClick={fetchStudents}
            disabled={loadingStudents}
          >
            {loadingStudents ? "Refreshing..." : "↻ Refresh Data"}
          </button>
        </header>

        {message && (
          <p className="error-message">{message}</p>
        )}

        {activeTab === "Dashboard" && (
          <>
            <section className="welcome-banner">
              <div>
                <p className="eyebrow">WELCOME TO IDENTIX</p>
                <h2>
                  Welcome, {institution.name || "Institution"}!
                </h2>
                <p>
                  Manage student identity records and monitor
                  verification progress from one place.
                </p>
              </div>
              <div className="banner-icon">✓</div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <p>Total Students</p>
                <h2>{students.length}</h2>
                <span>Records in your institution</span>
              </div>

              <div className="stat-card">
                <p>Verified Students</p>
                <h2>{verified}</h2>
                <span>Successfully verified</span>
              </div>

              <div className="stat-card">
                <p>Pending Verification</p>
                <h2>{pending}</h2>
                <span>Awaiting verification</span>
              </div>

              <div className="stat-card">
                <p>Rejected Records</p>
                <h2>{rejected}</h2>
                <span>Require review</span>
              </div>

              <div className="stat-card">
                <p>Correction Required</p>
                <h2>{correctionRequired}</h2>
                <span>Records needing correction</span>
              </div>
            </section>

            <section className="records-section">
              {renderStudentTable()}
            </section>
          </>
        )}

        {activeTab === "Student Records" && (
          <section className="records-section">
            {renderStudentTable()}
          </section>
        )}

        {activeTab === "Verification" && (
          <section className="records-section">
            {renderStudentTable()}
          </section>
        )}

        <footer className="dashboard-footer">
          Identix · Student Identity Verification Platform
        </footer>
      </main>
    </div>
  );
}

export default App;
