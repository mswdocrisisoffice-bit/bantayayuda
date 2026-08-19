import { useRef, useState } from 'react'
import { AdminTabs } from './AdminDashboard.jsx'
import manoloFortichSeal from '../../assets/manolo-fortich-seal.png'
import bagongPilipinasLogo from '../../assets/bagong-pilipinas-logo.png'

// ── Editable text block (locked template, editable content) ──
function Editable({ value, onChange, className = '', as = 'div', placeholder = '' }) {
  const Tag = as
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={(e) => onChange(e.currentTarget.innerText)}
      className={`editable-field outline-none focus:bg-yellow-50 ${className}`}
    >
      {value}
    </Tag>
  )
}

// ── Editable bullet list ──
function EditableList({ items, onChange }) {
  function updateItem(i, text) {
    const next = [...items]
    next[i] = text
    onChange(next)
  }
  function addItem() {
    onChange([...items, 'New item'])
  }
  function removeItem(i) {
    onChange(items.filter((_, idx) => idx !== i))
  }
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, i) => (
        <li key={i} className="group relative">
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateItem(i, e.currentTarget.innerText)}
            className="outline-none focus:bg-yellow-50"
          >
            {item}
          </span>
          <button
            onClick={() => removeItem(i)}
            className="no-print ml-2 hidden text-[10px] font-bold text-admin group-hover:inline"
          >
            remove
          </button>
        </li>
      ))}
      <button
        onClick={addItem}
        className="no-print mt-1 text-[11px] font-semibold text-beneficiary-dark"
      >
        + add item
      </button>
    </ul>
  )
}

// ── Photo/signature upload box ──
function ImageSlot({ label, image, onUpload, className = '', shape = 'rect' }) {
  const inputRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onUpload(reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className={className}>
      {image ? (
        <div className="group relative">
          <img
            src={image}
            alt={label}
            className={`w-full object-cover ${shape === 'circle' ? 'rounded-full' : ''}`}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="no-print absolute inset-0 hidden items-center justify-center bg-black/50 text-xs font-bold text-white group-hover:flex"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className={`no-print flex w-full items-center justify-center border-2 border-dashed border-line text-[11px] text-faint ${
            shape === 'circle' ? 'aspect-square rounded-full' : 'aspect-video'
          }`}
        >
          + {label}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}

const initialState = {
  reportTitle: 'ACCOMPLISHMENT REPORT',
  sectionTitle: 'I. DISASTER RESPONSE AND CAMP MANAGEMENT',
  date: 'June 19, 2026',
  intro:
    'From January to June 2026, the Office of the Municipal Social Welfare and Development (MSWD) actively responded to various disaster incidents, particularly landslides and fire incidents, that affected several families within the Municipality of Manolo Fortich. In accordance with its mandate to provide immediate humanitarian assistance to disaster-affected individuals and families, the Office activated its Camp Management assistance to ensure the safety, protection, and welfare of displaced residents.',
  leadership:
    'The Municipal Social Welfare and Development Office, under the leadership of Maria Cecilia C. Sajonia, MSSW, Municipal Social Welfare Officer (MSWDO), immediately mobilized its personnel to conduct rapid damage and needs assessments, coordinate with the Municipal Disaster Risk Management Office (MDRRMO), barangay officials, and other partner agencies, and provide appropriate interventions to affected families.',
  objectivesIntro: 'The disaster response and camp management activities aimed to:',
  objectives: [
    'Provide immediate humanitarian assistance to families affected by disasters and emergencies.',
    'Ensure the safety, protection, and welfare of internally displaced persons (IDPs) through effective camp management.',
    'Conduct rapid assessments to determine the needs of affected families.',
    'Coordinate relief operations with concerned government agencies and local stakeholders.',
    'Provide psychosocial support and other social welfare services to disaster survivors.',
  ],
  accomplishmentIntro:
    'During the reporting period, the Office successfully implemented the following disaster response activities:',
  accomplishments: [
    'Activated Camp Management services in evacuation centers affected by landslide and fire incidents.',
    'Coordinated with the MDRRMO, barangay officials, and partner agencies to ensure the timely delivery of assistance, including:',
  ],
  reliefItems: ['Food Packs', 'Family Kits', 'Hygiene Kits', 'Sleeping Kits', 'Jerry Cans'],
  outcomesIntro:
    'The disaster response operations successfully provided immediate relief and protection to affected families. Through effective camp management and coordinated humanitarian assistance, displaced individuals were able to access basic necessities and social welfare services while staying in evacuation centers. The Office also strengthened its partnership with local stakeholders, resulting in a more organized and responsive disaster management system.',
  outcomes: [
    'Monitored the condition of displaced families and ensured the continuous provision of basic social welfare services while staying in evacuation centers.',
    'Facilitated the proper documentation and reporting of disaster response activities for submission to concerned agencies.',
  ],
  photoCaption: 'Photo Documentation Barangay San Miguel and Damilag',
  preparedByName: 'RYAN M. ZALDEAVAR, RSW',
  preparedByTitle: 'SWO I',
  certifiedByName: 'MARIA CECILIA C. SAJONIA, MSSW',
  certifiedByTitle: 'Municipal Social Welfare and Development Officer',
}

export default function ReportGenerator() {
  const [r, setR] = useState(initialState)
  const [photos, setPhotos] = useState([null, null])
  const [preparedSig, setPreparedSig] = useState(null)
  const [certifiedSig, setCertifiedSig] = useState(null)

  function set(field, value) {
    setR((prev) => ({ ...prev, [field]: value }))
  }

  function setPhoto(i, dataUrl) {
    setPhotos((prev) => {
      const next = [...prev]
      next[i] = dataUrl
      return next
    })
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-8">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; }
        }
        .editable-field:empty:before {
          content: attr(data-placeholder);
          color: #aaa;
        }
      `}</style>

      <div className="mx-auto max-w-5xl no-print">
        <h1 className="mb-1 text-xl font-bold text-admin-dark">Report generator</h1>
        <p className="mb-6 text-xs text-faint">
          Click any text, photo, or signature below to edit it. The letterhead layout stays
          fixed — only the content changes.
        </p>
        <AdminTabs />
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-admin px-5 py-2 text-sm font-bold text-white hover:bg-admin-dark"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* ── Printable page ── */}
      <div className="print-page mx-auto max-w-[850px] bg-white p-10 text-[13px] leading-snug text-black shadow-lg">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b-2 border-black pb-3">
          <img src={manoloFortichSeal} alt="Manolo Fortich official seal" className="w-16" />
          <div className="flex-1 px-4 text-center">
            <div className="text-[11px]">Republic of the Philippines</div>
            <div className="text-[11px]">Province of Bukidnon</div>
            <div className="text-[13px] font-bold">MUNICIPALITY OF MANOLO FORTICH</div>
            <div className="text-[13px] font-bold">
              MUNICIPAL SOCIAL WELFARE AND DEVELOPMENT OFFICE
            </div>
          </div>
          <img src={bagongPilipinasLogo} alt="Bagong Pilipinas" className="w-16" />
        </div>

        <div className="mb-1 text-right text-[11px]">
          <Editable value={r.date} onChange={(v) => set('date', v)} className="inline-block" />
        </div>

        <div className="mb-4 text-center">
          <Editable
            value={r.reportTitle}
            onChange={(v) => set('reportTitle', v)}
            className="inline-block text-base font-bold tracking-wide underline"
          />
        </div>

        <Editable
          value={r.sectionTitle}
          onChange={(v) => set('sectionTitle', v)}
          className="mb-3 font-bold"
        />

        <Editable
          value={r.intro}
          onChange={(v) => set('intro', v)}
          className="mb-3 text-justify"
          placeholder="Introduction paragraph…"
        />

        <Editable
          value={r.leadership}
          onChange={(v) => set('leadership', v)}
          className="mb-4 text-justify"
          placeholder="Leadership / mobilization paragraph…"
        />

        <div className="mb-1 font-bold underline">Objectives</div>
        <Editable
          value={r.objectivesIntro}
          onChange={(v) => set('objectivesIntro', v)}
          className="mb-1"
        />
        <div className="mb-4">
          <EditableList items={r.objectives} onChange={(v) => set('objectives', v)} />
        </div>

        <div className="mb-1 font-bold underline">Accomplishment</div>
        <Editable
          value={r.accomplishmentIntro}
          onChange={(v) => set('accomplishmentIntro', v)}
          className="mb-1"
        />
        <div className="mb-2">
          <EditableList items={r.accomplishments} onChange={(v) => set('accomplishments', v)} />
        </div>
        <div className="mb-4 pl-8">
          <EditableList items={r.reliefItems} onChange={(v) => set('reliefItems', v)} />
        </div>

        <div className="mb-1 font-bold underline">Outcomes</div>
        <Editable
          value={r.outcomesIntro}
          onChange={(v) => set('outcomesIntro', v)}
          className="mb-2 text-justify"
        />
        <div className="mb-6">
          <EditableList items={r.outcomes} onChange={(v) => set('outcomes', v)} />
        </div>

        {/* Photo documentation */}
        <div className="mb-1 font-bold underline">
          <Editable value={r.photoCaption} onChange={(v) => set('photoCaption', v)} />
        </div>
        <div className="mb-8 grid grid-cols-2 gap-3">
          <ImageSlot label="Add photo" image={photos[0]} onUpload={(d) => setPhoto(0, d)} />
          <ImageSlot label="Add photo" image={photos[1]} onUpload={(d) => setPhoto(1, d)} />
        </div>

        {/* Signatures */}
        <div className="mb-8">
          <div>Prepared by:</div>
          <div className="mt-6 h-14 w-48">
            <ImageSlot label="Signature" image={preparedSig} onUpload={setPreparedSig} />
          </div>
          <Editable
            value={r.preparedByName}
            onChange={(v) => set('preparedByName', v)}
            className="border-t border-black pt-0.5 font-bold w-64"
          />
          <Editable
            value={r.preparedByTitle}
            onChange={(v) => set('preparedByTitle', v)}
            className="w-64"
          />
        </div>

        <div>
          <div>Certified True and Correct:</div>
          <div className="mt-6 h-14 w-48">
            <ImageSlot label="Signature" image={certifiedSig} onUpload={setCertifiedSig} />
          </div>
          <Editable
            value={r.certifiedByName}
            onChange={(v) => set('certifiedByName', v)}
            className="border-t border-black pt-0.5 font-bold w-64"
          />
          <Editable
            value={r.certifiedByTitle}
            onChange={(v) => set('certifiedByTitle', v)}
            className="w-64"
          />
        </div>
      </div>
    </div>
  )
}
