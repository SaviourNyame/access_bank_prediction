import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MAX_PLAYS = 2;

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const body = await req.json() as { name?: string; phone?: string; isFirstTime?: boolean };
    const name        = body.name?.trim() ?? "";
    const phone       = body.phone?.trim() ?? "";
    const isFirstTime = body.isFirstTime === true;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    // Block if they already won (checked by phone)
    const wonSnap = await getDocs(
      query(collection(db, "triviaCoupons"), where("phone", "==", phone)),
    );
    if (wonSnap.size > 0) {
      return NextResponse.json({ allowed: false, reason: "already_won" });
    }

    // Block duplicate phone on first-time registration
    if (isFirstTime) {
      const phoneSnap = await getDocs(
        query(collection(db, "triviaEntries"), where("phone", "==", phone)),
      );
      if (phoneSnap.size > 0) {
        return NextResponse.json({ allowed: false, reason: "phone_taken" });
      }
    }

    // Block if IP has hit the play limit
    const ipSnap = await getDocs(
      query(collection(db, "triviaEntries"), where("ip", "==", ip)),
    );
    if (ipSnap.size >= MAX_PLAYS) {
      return NextResponse.json({ allowed: false, reason: "limit_reached" });
    }

    await addDoc(collection(db, "triviaEntries"), {
      name,
      phone,
      ip,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ allowed: true });
  } catch (err) {
    console.error("trivia-entry error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
