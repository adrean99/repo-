import { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-US": require("date-fns/locale/en-US") };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const LeaveCalendar = () => {
  const [events, setEvents] = useState([]);

  // Fetch approved leave requests
  useEffect(() => {
    fetch("http://localhost:5000/api/leaves/approved", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        // Convert leave data to calendar format
        const formattedEvents = data.map((leave) => ({
          title: `${leave.employeeId?.name} - Leave`,
          start: new Date(leave.startDate),
          end: new Date(leave.endDate),
          allDay: true,
        }));
        setEvents(formattedEvents);
      });
  }, []);

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
