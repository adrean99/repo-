import { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import "react-big-calendar/lib/css/react-big-calendar.css";
import apiClient from "../utils/apiClient";

const locales = { "en-US": require("date-fns/locale/en-US") };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const LeaveCalendar = () => {
  const [events, setEvents] = useState([]);

  // Fetch approved leave requests
  useEffect(() => {
    const fetchApprovedLeaves = async () => {
    try{
    const res = await apiClient.get("/api/leaves/approved", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch data");
        }
        return res.json();
      })
      .then((data) => {
        console.log("Fetched data:", data);  // Log the data to check its structure

        // Check if the data is an array or if it contains an array (e.g., data.leaves)
        const leaves = Array.isArray(data) ? data : data.leaves || [];

        if (leaves.length > 0) {
          const formattedEvents = leaves.map((leave) => ({
            title: `${leave.employeeId?.name} - Leave`,
            start: new Date(leave.startDate),
            end: new Date(leave.endDate),
            allDay: true,
          }));
          setEvents(formattedEvents);
        } else {
          console.error("No valid leave data found.");
        }
      })
    }catch(error) {
        console.error("Error fetching leave data:", error);
      }

  };
  fetchApprovedLeaves();
},
   []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Leave Calendar</h2>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
      />
    </div>
  );
};

export default LeaveCalendar;
