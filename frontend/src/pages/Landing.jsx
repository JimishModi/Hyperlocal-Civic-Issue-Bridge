import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="page page-enter flex flex-col items-center justify-center min-h-screen text-center">
      <h1 className="text-h1 text-primary-container mb-4">
        Civic Issue Bridge
      </h1>
      <p className="text-body-md text-accent-slate mb-8">
        Report local issues in Powai — get them to the right BMC department.
      </p>
      <button
        className="btn-primary max-w-xs"
        onClick={() => navigate('/intake')}
      >
        Report an Issue
      </button>
    </div>
  )
}
