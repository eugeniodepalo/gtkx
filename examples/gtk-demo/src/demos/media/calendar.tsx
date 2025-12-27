import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkCalendar, GtkFrame, GtkLabel } from "@gtkx/react";
import { useState } from "react";
import type { Demo } from "../types.js";

const CalendarDemo = () => {
    const [selectedDay, setSelectedDay] = useState(new Date().getDate());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const formatDate = (day: number, month: number, year: number) => {
        const date = new Date(year, month, day);
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Calendar" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="GtkCalendar is a widget that displays a calendar and allows the user to select a date. It supports navigation between months and years, and can show week numbers and day names."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Basic Calendar */}
            <GtkFrame label="Date Selection">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkCalendar
                        day={selectedDay}
                        month={selectedMonth}
                        year={selectedYear}
                        showHeading
                        showDayNames
                        onDaySelected={(self) => {
                            setSelectedDay(self.getDay());
                            setSelectedMonth(self.getMonth());
                            setSelectedYear(self.getYear());
                        }}
                        halign={Gtk.Align.CENTER}
                    />
                    <GtkLabel
                        label={`Selected: ${formatDate(selectedDay, selectedMonth, selectedYear)}`}
                        cssClasses={["dim-label"]}
                        halign={Gtk.Align.CENTER}
                    />
                </GtkBox>
            </GtkFrame>

            {/* Calendar with Week Numbers */}
            <GtkFrame label="With Week Numbers">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="The calendar can display week numbers on the left side"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkCalendar showHeading showDayNames showWeekNumbers halign={Gtk.Align.CENTER} />
                </GtkBox>
            </GtkFrame>

            {/* Minimal Calendar */}
            <GtkFrame label="Minimal Style">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Calendar without heading and day names for a compact display"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkCalendar showHeading={false} showDayNames={false} halign={Gtk.Align.CENTER} />
                </GtkBox>
            </GtkFrame>

            {/* Navigation Demo */}
            <GtkFrame label="Navigation Events">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="The calendar emits signals when navigating between months and years. Use the arrows to see the current view update."
                        wrap
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <CalendarWithNavigation />
                </GtkBox>
            </GtkFrame>

            {/* Quick Date Selection */}
            <GtkFrame label="Quick Date Selection">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.CENTER}>
                        <GtkButton
                            label="Today"
                            onClicked={() => {
                                const today = new Date();
                                setSelectedDay(today.getDate());
                                setSelectedMonth(today.getMonth());
                                setSelectedYear(today.getFullYear());
                            }}
                            cssClasses={["suggested-action"]}
                        />
                        <GtkButton
                            label="New Year"
                            onClicked={() => {
                                setSelectedDay(1);
                                setSelectedMonth(0);
                            }}
                        />
                        <GtkButton
                            label="Christmas"
                            onClicked={() => {
                                setSelectedDay(25);
                                setSelectedMonth(11);
                            }}
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

const CalendarWithNavigation = () => {
    const [viewMonth, setViewMonth] = useState(new Date().getMonth());
    const [viewYear, setViewYear] = useState(new Date().getFullYear());

    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
            <GtkLabel
                label={`Currently viewing: ${monthNames[viewMonth]} ${viewYear}`}
                cssClasses={["heading"]}
                halign={Gtk.Align.CENTER}
            />
            <GtkCalendar
                showHeading
                showDayNames
                onNextMonth={(self) => {
                    setViewMonth(self.getMonth());
                    setViewYear(self.getYear());
                }}
                onPrevMonth={(self) => {
                    setViewMonth(self.getMonth());
                    setViewYear(self.getYear());
                }}
                onNextYear={(self) => {
                    setViewMonth(self.getMonth());
                    setViewYear(self.getYear());
                }}
                onPrevYear={(self) => {
                    setViewMonth(self.getMonth());
                    setViewYear(self.getYear());
                }}
                halign={Gtk.Align.CENTER}
            />
        </GtkBox>
    );
};

const sourceCode = `import { useState } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkCalendar, GtkLabel, GtkButton } from "@gtkx/react";

const CalendarDemo = () => {
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      {/* Basic calendar with date selection */}
      <GtkCalendar
        day={selectedDay}
        month={selectedMonth}
        year={selectedYear}
        showHeading
        showDayNames
        onDaySelected={(self) => {
          setSelectedDay(self.getDay());
          setSelectedMonth(self.getMonth());
          setSelectedYear(self.getYear());
        }}
      />

      {/* Calendar with week numbers */}
      <GtkCalendar
        showHeading
        showDayNames
        showWeekNumbers
      />

      {/* Minimal calendar */}
      <GtkCalendar
        showHeading={false}
        showDayNames={false}
      />

      {/* Navigation events */}
      <GtkCalendar
        onNextMonth={(self) => console.log("Next month:", self.getMonth())}
        onPrevMonth={(self) => console.log("Previous month:", self.getMonth())}
        onNextYear={(self) => console.log("Next year:", self.getYear())}
        onPrevYear={(self) => console.log("Previous year:", self.getYear())}
      />
    </GtkBox>
  );
};`;

export const calendarDemo: Demo = {
    id: "calendar",
    title: "Calendar",
    description: "Date selection with GtkCalendar widget",
    keywords: ["calendar", "date", "picker", "GtkCalendar", "day", "month", "year", "schedule"],
    component: CalendarDemo,
    sourceCode,
};
